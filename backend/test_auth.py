import requests

API_URL = "http://localhost:8000"

def try_login(email, password):
    """Попытка авторизации"""
    response = requests.post(
        f"{API_URL}/token",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    print(f"Попытка входа: {email} / {password}")
    print(f"Статус: {response.status_code}")
    print(f"Ответ: {response.text}\n")
    
    if response.status_code == 200:
        return response.json().get("access_token")
    return None

# Перебираем различные комбинации
passwords = ["123", "password", "admin", "123456", "test", "recruiter", "1234"]
accounts = [
    "admin@example.com",
    "admin@admin.com",
    "recrut@1.com",
    "admin@abstract.com",
    "admin@gmail.com",
    "recruiter@example.com",
    "test@test.com"
]

for email in accounts:
    for password in passwords:
        token = try_login(email, password)
        if token:
            print(f"Успешный вход: {email} / {password}")
            print(f"Токен: {token[:30]}...")
            break 