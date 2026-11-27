// Registrar aquí cada migración nueva para usar la misma lista en TS y JS.
import { InitialSchema1795024800000 } from "./1795024800000-InitialSchema";

import { SecureBaseline1795024900000 } from "./1795024900000-SecureBaseline";
import { WalletVirtualType1795025000000 } from "./1795025000000-WalletVirtualType";
import { NeutralFixtureAccounts1795025100000 } from "./1795025100000-NeutralFixtureAccounts";

export const migrations = [
  InitialSchema1795024800000,
  SecureBaseline1795024900000,
  WalletVirtualType1795025000000,
  NeutralFixtureAccounts1795025100000,
];
