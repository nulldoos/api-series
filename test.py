import os

import pytest
import requests

BASE_URL = "http://localhost:3000"
USUARIO = os.environ.get("ADMIN_USERNAME", "leone")
SENHA = os.environ.get("ADMIN_PASSWORD", "1234")

@pytest.fixture(scope="module")
def base_url():
    return BASE_URL


def test_listar_todas_series_status_200(base_url):
    resp = requests.get(f"{base_url}/api/series")
    assert resp.status_code == 200


def test_listar_todas_series_retorna_lista(base_url):
    resp = requests.get(f"{base_url}/api/series")
    dados = resp.json()
    assert isinstance(dados, list)
    assert len(dados) > 0


@pytest.fixture
def sessao_autenticada(base_url):
    """Cria uma sessão de requests já logada, reaproveitando o cookie de sessão."""
    sessao = requests.Session()
    resp = sessao.post(
        f"{base_url}/api/login",
        json={"usuario": USUARIO, "senha": SENHA},
    )
    assert resp.status_code == 200, (
        "Login falhou - confira ADMIN_USERNAME/ADMIN_PASSWORD "
        f"(resposta: {resp.status_code} {resp.text})"
    )
    yield sessao
    sessao.post(f"{base_url}/api/logout")


def test_atualizar_serie_inexistente(base_url, sessao_autenticada):
    resp = sessao_autenticada.put(
        f"{base_url}/api/series/9999",
        json={"name": "Não existe", "episodes": 1},
    )
    assert resp.status_code == 404
    assert "erro" in resp.json()

def test_atualizar_serie_com_login_sucesso(base_url, sessao_autenticada):
    payload = {"name": "Dr. House", "episodes": 177}
    resp = sessao_autenticada.put(f"{base_url}/api/series/1", json=payload)
    assert resp.status_code == 200
    dados = resp.json()
    assert dados["id"] == 1
    assert dados["name"] == payload["name"]
    assert dados["episodes"] == payload["episodes"]


def test_atualizar_serie_sem_campo_name(base_url, sessao_autenticada):
    resp = sessao_autenticada.put(
        f"{base_url}/api/series/2",
        json={"episodes": 70},
    )
    assert resp.status_code == 400


def test_atualizar_serie_com_episodes_tipo_invalido(base_url, sessao_autenticada):
    resp = sessao_autenticada.put(
        f"{base_url}/api/series/2",
        json={"name": "Better Call Saul", "episodes": "sessenta e oito"},
    )
    assert resp.status_code == 400