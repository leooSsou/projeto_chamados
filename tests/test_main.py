def test_read_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "status": "online",
        "message": "Sistema de Chamados TI - API Hoteleira Operando"
    }
