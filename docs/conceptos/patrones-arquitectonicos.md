# Patrones Arquitectónicos — BANCA NEN

<!--

  ¿Qué? Patrones de diseño y arquitectura utilizados en BANCA NEN.

  ¿Para qué? Comprender las decisiones arquitectónicas y cómo cada patrón resuelve un problema específico.

  ¿Impacto? Código mantenible, testeable, escalable y desacoplado.

-->

---

## 1. Patrón Layered Architecture — Separación por Capas

BANCA NEN organiza su backend en **4 capas claras**, cada una con una responsabilidad única:

```
HTTP Request
    │
    ▼
[Middleware]     → Auth (JWT verify), Rate Limiting, CORS, Helmet, Error Handler
    │
    ▼
[Controller]     → Capa HTTP delgada. Extrae datos de req (body, params, user),
    │               delega al service, construye y envía la respuesta HTTP
    ▼
[Service]        → Contiene TODA la lógica de negocio.
    │               Orquesta llamadas al Repository, utils, email.
    │               Lanza errores tipados ante condiciones inválidas.
    ▼
[Repository]     → TypeORM Repository<Entity> — consultas type-safe a PostgreSQL.
                    Retorna instancias tipadas de la entidad.
```

### Ejemplo concreto — Registro de usuario

```typescript
// auth.controller.ts — capa HTTP delgada
export class AuthController {
  async register(req: Request, res: Response) {
    const result = await this.authService.register(req.body);
    return res.status(201).json(result);
  }
}

// auth.service.ts — lógica de negocio
export class AuthService {
  async register(dto: RegisterDto): Promise<UserResponseDto> {
    const existing = await this.usersRepository.findOneBy({ email: dto.email });
    if (existing) throw new ConflictError('Email ya registrado');

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = this.usersRepository.create({ ...dto, hashedPassword });
    await this.usersRepository.save(user);

    await this.mailService.sendVerificationEmail(user);
    return toUserResponseDto(user);
  }
}
```

**Beneficio educativo**: cada capa tiene una sola responsabilidad. Si hay un bug de negocio, buscar en el service. Si es HTTP, en el controller. Si es de BD, en el repository.

---

## 2. Patrón Repository (TypeORM)

TypeORM implementa explícitamente el patrón **Repository**: cada entidad tiene un `Repository<Entity>` inyectable que abstrae el acceso a la BD con una API type-safe.

```typescript
// ✅ Acceso centralizado a la BD a través del Repository de TypeORM
const user = await this.usersRepository.findOneBy({ email });

// ❌ SQL crudo disperso (anti-pattern)
// const [user] = await this.dataSource.query('SELECT * FROM users WHERE email = $1', [email]);
```

**Beneficio**: el código de negocio nunca escribe SQL directamente. Si se cambia de motor de BD, solo se actualiza la configuración de TypeORM, no el código de negocio.

---

## 3. Patrón Middleware — Pipeline de Request

Express procesa cada request a través de una cadena de middlewares, cada uno con una responsabilidad:

```typescript
// app.ts — orden de middlewares importa
app.use(helmet());                    // Security headers
app.use(cors(corsOptions));           // CORS
app.use(express.json());              // Body parsing
app.use(rateLimiter);                 // Rate limiting
app.use('/api/auth', authLimiter, authRoutes);  // Rate limit específico + rutas
app.use(errorHandler);                // Error handler (último)
```

**Flujo de un request autenticado:**

```
Request → helmet → cors → json parser → rateLimiter → authMiddleware (verifica JWT)
    → controller → service → repository → response
```

**Beneficio**: cada middleware es una función pura con una responsabilidad. Se pueden agregar, quitar o reordenar sin afectar los demás.

---

## 4. Patrón Strategy — Autenticación JWT

La verificación del JWT sigue el patrón **Strategy**: el mecanismo de autenticación está encapsulado en un middleware dedicado que sabe cómo extraer y validar el token.

```typescript
// auth.middleware.ts — Strategy de autenticación JWT
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token requerido' });

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
}
```

**Beneficio**: cambiar el mecanismo de auth (por ejemplo, agregar login con Google) implica agregar un nuevo middleware, sin tocar los controllers existentes.

---

## 5. Patrón DTO / Validation — Validación de Entrada

Cada operación tiene un schema de validación con **Zod** que intercepta y valida el body antes de que llegue al service:

```typescript
// schemas/auth.schema.ts — definición del schema
export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  firstName: z.string().min(2, 'Mínimo 2 caracteres'),
  lastName: z.string().min(2, 'Mínimo 2 caracteres'),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe tener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe tener al menos una minúscula')
    .regex(/[0-9]/, 'Debe tener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe tener al menos un carácter especial'),
  documentType: z.enum(['CC', 'CE', 'PASSPORT', 'DNI']),
  documentNumber: z.string().min(5),
  dateOfBirth: z.string(),
  country: z.string().min(2),
  phonePrefix: z.string(),
  phoneNumber: z.string().min(7),
});

// Middleware de validación
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.flatten() });
    }
    req.body = result.data;
    next();
  };
}
```

**Beneficio**: la validación vive en un schema declarativo, no en if/else dispersos en el controller. Si se agrega un campo, se actualiza el schema y listo.

---

## 6. Patrón Service — Lógica de Negocio Centralizada

Toda la lógica de negocio vive en los **services**, nunca en controllers ni repositories:

```typescript
// wallet.service.ts — lógica de negocio
export class WalletService {
  async deposit(userId: string, dto: DepositDto): Promise<Transaction> {
    // 1. Verificar que el usuario existe
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) throw new NotFoundError('Usuario no encontrado');

    // 2. Verificar límites
    const todayWithdrawn = await this.getTodayTotal(userId, 'deposit');
    if (todayWithdrawn + dto.amount > user.dailyDepositLimit) {
      throw new BadRequestError('Excede el límite diario de depósito');
    }

    // 3. Crear transacción
    const transaction = this.transactionsRepository.create({
      type: 'deposit',
      amount: dto.amount,
      currency: dto.currency,
      status: 'pending',
      userId,
    });
    await this.transactionsRepository.save(transaction);

    // 4. Actualizar balance
    await this.updateBalance(userId, dto.currency, dto.amount);

    // 5. Registrar auditoría
    await this.auditService.log(userId, 'DEPOSIT', transaction);

    // 6. Notificar
    await this.notificationService.notify(userId, 'transaction', 'Depósito recibido');

    return transaction;
  }
}
```

**Beneficio**: el controller solo llama al service. El service orquesta todas las operaciones necesarias. Si la lógica cambia, se modifica en un solo lugar.

---

## 7. Patrón Context/Provider (React) — Estado Global

El estado de autenticación se gestiona con el patrón **Context/Provider** de React:

```
AuthProvider (en App.tsx)
    │
    │  Provee: { user, accessToken, login, logout, register }
    │
    ├── LandingPage (no usa auth)
    ├── LoginPage → useAuth() → login()
    ├── RegisterPage → useAuth() → register()
    └── DashboardPage (protegida) → useAuth() → user
```

```typescript
// AuthContext.tsx — define el contexto y su tipo
const AuthContext = createContext<AuthContextType | null>(null);

// useAuth.ts — hook que consume el contexto con validación
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

**Beneficio**: evita "prop drilling" (pasar props de autenticación por cada nivel del árbol de componentes).

---

## 8. Patrón Zustand — Estado Global Persistente

Para estado que debe persistir entre recargas (como el token de auth), BANCA NEN usa **Zustand** con el middleware `persist`:

```typescript
// auth.slice.ts — estado global con Zustand
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage', // clave en localStorage
    }
  )
);
```

**Beneficio**: a diferencia de Context, Zustand no provoca re-renders innecesarios. Solo los componentes que leen el campo modificado se re-renderizan.

---

## 9. Patrón Error Handler — Manejo de Errores Centralizado

Un middleware de error handler captura todos los errores y los serializa en un formato JSON consistente:

```typescript
// error.middleware.ts
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    });
  }

  // Errores no controlados — nunca exponer detalles internos
  console.error('[ERROR]', err.message);
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    code: 'INTERNAL_ERROR',
  });
}
```

**Beneficio**: los controllers y services solo lanzan errores — no manejan la respuesta HTTP. El error handler garantiza formato consistente.

---

## 10. Patrón Response DTO — Nunca Exponer la Entidad Completa

Los datos que salen de la BD nunca se retornan directamente. Se transforman a un DTO de respuesta que excluye campos sensibles:

```typescript
// ¿Qué? Transforma un User (entidad TypeORM) a UserResponseDto sin hashedPassword.
// ¿Para qué? Nunca exponer el hash de contraseña en respuestas HTTP.
// ¿Impacto? Si se retorna la entidad completa, el hash queda expuesto.
export function toUserResponseDto(user: User): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status,
    isEmailVerified: user.isEmailVerified,
    role: user.role,
    createdAt: user.createdAt,
    // hashedPassword: user.hashedPassword  ← NUNCA incluir
    // twoFactorSecret: user.twoFactorSecret  ← NUNCA incluir
  };
}
```

---

## 11. Patrón Audit Chain — Cadena Inmutable de Hash

Los registros de auditoría forman una cadena inmutable donde cada registro incluye el hash del anterior:

```typescript
// ¿Qué? Cada audit log incluye el hash SHA-256 del registro anterior.
// ¿Para qué? Garantizar que los registros no pueden ser modificados sin detectarlo.
// ¿Impacto? Cumplimiento SARLAFT y trazabilidad completa.

async createLog(action: string, userId: string, details: object): Promise<AuditLog> {
  const lastLog = await this.auditRepo.findLast();

  const hash = crypto
    .createHash('sha256')
    .update(`${action}|${userId}|${JSON.stringify(details)}|${Date.now()}|${lastLog?.hash || 'GENESIS'}`)
    .digest('hex');

  return this.auditRepo.save({ action, userId, details, hash, previousHash: lastLog?.hash || 'GENESIS' });
}
```

**Beneficio**: cualquier modificación de un registro anterior invalida toda la cadena de hash posterior, detectable automáticamente.

---

## 12. Comparación con Otras Arquitecturas

| Aspecto | Express + TypeORM (BANCA NEN) | NestJS + TypeORM | FastAPI + SQLAlchemy |
|---|---|---|---|
| Validación | Zod + middleware `validate` | class-validator + DTOs + `ValidationPipe` | Pydantic (decoradores) |
| Routing | `router.post()` explícito | Decoradores `@Post()` en `@Controller()` | Decoradores `@router.post` |
| Inyección de dependencias | Argumentos de función / middleware | DI por constructor nativo del framework | `Depends()` de FastAPI |
| ORM | TypeORM | TypeORM | SQLAlchemy 2.0 |
| Migraciones | TypeORM CLI | TypeORM CLI | Alembic |
| Async | `async/await` nativo | `async/await` nativo | `async def` nativo |
| Autenticación | Middleware `authMiddleware` | `@UseGuards(JwtAuthGuard)` + Passport Strategy | `Depends(get_current_user)` |
| Manejo de errores | Error handler middleware | Exception Filters | HTTPException |
| Estado frontend | Zustand + Context | Context/Provider | Context/Provider |
| Testing | Jest + supertest | Jest + supertest | pytest + httpx |

---

**Proyecto:** BANCA NEN (FinPredictor Pro)  
**Versión:** 1.0  
**Fecha:** Enero 2025
