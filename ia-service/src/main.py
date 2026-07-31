from fastapi import FastAPI
app = FastAPI(title='IA Service - Banca NeN')

@app.get('/')
def root():
    return {'message': 'IA Service running'}
