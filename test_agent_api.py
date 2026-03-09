import httpx
import asyncio
import json

async def test_execution():
    url = "http://localhost:8005/execute"
    
    # Teste 1: Listar Projetos
    print("\nTesting list_projects...")
    payload = {
        "tool": "list_projects",
        "args": {},
        "user_id": "357be199-547d-4011-b8a5-3faa1872b5c9" # Igor Fernandes
    }
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, timeout=10.0)
            print(f"Status: {res.status_code}")
            print(f"Response: {res.text}")
            
    except Exception as e:
        print(f"Error: {e}")

    # Teste 2: Atribuir membro ao projeto (Hiago ao Coliseu)
    print("\nTesting assign_project_member...")
    payload = {
        "tool": "assign_project_member",
        "args": {
            "user_identifier": "hiago",
            "project_name": "Coliseu"
        },
        "user_id": "357be199-547d-4011-b8a5-3faa1872b5c9"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json=payload, timeout=10.0)
            print(f"Status: {res.status_code}")
            print(f"Response: {res.text}")
    except Exception as e:
        print(f"Error: {e}")

    # Teste 3: Atribuir tarefa (Exemplo)
    print("\nTesting assign_task...")
    payload = {
        "tool": "assign_task",
        "args": {
            "task_id": "some-id", # Precisamos de uma tarefa real se quisermos testar fundo
            "user_identifier": "hiago"
        },
        "user_id": "357be199-547d-4011-b8a5-3faa1872b5c9"
    }
    # (Omitindo execução real do teste 3 por enquanto para não dar erro de ID inexistente)

if __name__ == "__main__":
    asyncio.run(test_execution())
