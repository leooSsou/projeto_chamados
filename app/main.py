from datetime import datetime

from fastapi import Depends, FastAPI, Form, Request, Response
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from .database import BASE_DIR, Base, SessionLocal, engine, get_db
from .models import AuditLog, Comment, Ticket, User
from .security import SESSION_COOKIE, current_user, hash_password, sign_session, verify_password


HOTELS = ["Hotel Acalanto", "Hotel Classe", "Hotel Unico", "Hotel Atmosfera"]
STATUSES = ["Aberto", "Em atendimento", "Aguardando retorno", "Resolvido", "Cancelado"]
PROFILES = ["Usuario", "Suporte"]

app = FastAPI(title="Sistema de Chamados")
app.mount("/static", StaticFiles(directory=BASE_DIR / "app" / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "app" / "templates")
templates.env.globals["hotels"] = HOTELS
templates.env.globals["statuses"] = STATUSES
templates.env.globals["profiles"] = PROFILES


def flash_redirect(url: str, message: str = "", level: str = "info") -> RedirectResponse:
    response = RedirectResponse(url, status_code=303)
    if message:
        response.set_cookie("flash", f"{level}|{message}", max_age=5, httponly=True, samesite="lax")
    return response


def render(request: Request, template: str, context: dict, status_code: int = 200) -> HTMLResponse:
    flash_cookie = request.cookies.get("flash", "")
    flash = None
    if "|" in flash_cookie:
        level, message = flash_cookie.split("|", 1)
        flash = {"level": level, "message": message}
    response = templates.TemplateResponse(
        request,
        template,
        {**context, "flash": flash},
        status_code=status_code,
    )
    if flash:
        response.delete_cookie("flash")
    return response


def require_user(request: Request, db: Session) -> User | RedirectResponse:
    user = current_user(request, db)
    if not user:
        return flash_redirect("/login", "Faça login para continuar.", "warning")
    return user


def write_log(db: Session, user: User | None, action: str, details: str) -> None:
    db.add(AuditLog(user_id=user.id if user else None, action=action, details=details))


def seed_database() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        has_users = db.scalar(select(User.id).limit(1))
        if has_users:
            return
        support = User(
            username="suporte",
            password_hash=hash_password("suporte123"),
            hotel="Todos",
            profile="Suporte",
        )
        user = User(
            username="usuario",
            password_hash=hash_password("usuario123"),
            hotel=HOTELS[0],
            profile="Usuario",
        )
        db.add_all([support, user])
        db.commit()
    finally:
        db.close()


@app.on_event("startup")
def on_startup() -> None:
    seed_database()


@app.get("/", response_class=HTMLResponse)
def home(request: Request, db: Session = Depends(get_db)):
    user = current_user(request, db)
    if not user:
        return RedirectResponse("/login", status_code=303)
    return RedirectResponse("/tickets", status_code=303)


@app.get("/login", response_class=HTMLResponse)
def login_form(request: Request):
    return render(request, "login.html", {})


@app.post("/login")
def login(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    user = db.scalar(select(User).where(User.username == username.strip()))
    if not user or not verify_password(password, user.password_hash):
        write_log(db, None, "LOGIN_FAIL", f"Tentativa de login para '{username}'.")
        db.commit()
        return render(request, "login.html", {"username": username, "error": "Usuário ou senha inválidos."}, 401)

    write_log(db, user, "LOGIN_SUCCESS", f"Usuário '{user.username}' logou.")
    db.commit()
    response = flash_redirect("/tickets", f"Bem-vindo, {user.username}.", "success")
    response.set_cookie(SESSION_COOKIE, sign_session(user.id), httponly=True, samesite="lax")
    return response


@app.post("/logout")
def logout(request: Request, db: Session = Depends(get_db)):
    user = current_user(request, db)
    if user:
        write_log(db, user, "LOGOUT", f"Usuário '{user.username}' saiu.")
        db.commit()
    response = flash_redirect("/login", "Você saiu do sistema.", "info")
    response.delete_cookie(SESSION_COOKIE)
    return response


@app.get("/tickets", response_class=HTMLResponse)
def tickets(
    request: Request,
    hotel: str = "",
    status: str = "",
    q: str = "",
    db: Session = Depends(get_db),
):
    user = require_user(request, db)
    if isinstance(user, Response):
        return user

    query = select(Ticket).options(joinedload(Ticket.requester)).order_by(Ticket.created_at.desc())
    if user.profile != "Suporte":
        query = query.where(Ticket.requester_id == user.id)
    if hotel:
        query = query.where(Ticket.hotel == hotel)
    if status:
        query = query.where(Ticket.status == status)
    if q:
        like = f"%{q.strip()}%"
        query = query.where(or_(Ticket.code.ilike(like), Ticket.description.ilike(like)))

    rows = db.scalars(query).all()
    return render(request, "tickets.html", {"user": user, "tickets": rows, "filters": {"hotel": hotel, "status": status, "q": q}})


@app.get("/tickets/new", response_class=HTMLResponse)
def new_ticket_form(request: Request, db: Session = Depends(get_db)):
    user = require_user(request, db)
    if isinstance(user, Response):
        return user
    return render(request, "ticket_form.html", {"user": user})


@app.post("/tickets/new")
def create_ticket(
    request: Request,
    description: str = Form(...),
    db: Session = Depends(get_db),
):
    user = require_user(request, db)
    if isinstance(user, Response):
        return user
    if not description.strip():
        return render(request, "ticket_form.html", {"user": user, "error": "Descreva o problema."}, 422)

    ticket = Ticket(hotel=user.hotel, requester_id=user.id, description=description.strip(), status="Aberto")
    db.add(ticket)
    db.flush()
    ticket.code = f"{datetime.utcnow():%Y-%m-%d}-{ticket.id:06d}"
    write_log(db, user, "TICKET_CREATED", f"Criou o chamado '{ticket.code}'.")
    db.commit()
    return flash_redirect(f"/tickets/{ticket.id}", f"Chamado {ticket.code} aberto com sucesso.", "success")


@app.get("/tickets/{ticket_id}", response_class=HTMLResponse)
def ticket_detail(request: Request, ticket_id: int, db: Session = Depends(get_db)):
    user = require_user(request, db)
    if isinstance(user, Response):
        return user
    ticket = db.scalar(
        select(Ticket)
        .options(joinedload(Ticket.requester), joinedload(Ticket.comments).joinedload(Comment.author))
        .where(Ticket.id == ticket_id)
    )
    if not ticket:
        return flash_redirect("/tickets", "Chamado não encontrado.", "warning")
    if user.profile != "Suporte" and ticket.requester_id != user.id:
        return flash_redirect("/tickets", "Você não tem acesso a esse chamado.", "warning")
    return render(request, "ticket_detail.html", {"user": user, "ticket": ticket})


@app.post("/tickets/{ticket_id}/comments")
def add_comment(
    request: Request,
    ticket_id: int,
    message: str = Form(...),
    db: Session = Depends(get_db),
):
    user = require_user(request, db)
    if isinstance(user, Response):
        return user
    ticket = db.get(Ticket, ticket_id)
    if not ticket or (user.profile != "Suporte" and ticket.requester_id != user.id):
        return flash_redirect("/tickets", "Chamado não encontrado.", "warning")
    if message.strip():
        db.add(Comment(ticket_id=ticket.id, author_id=user.id, message=message.strip()))
        write_log(db, user, "COMMENT_CREATED", f"Comentou no chamado '{ticket.code}'.")
        db.commit()
    return RedirectResponse(f"/tickets/{ticket.id}", status_code=303)


@app.post("/tickets/{ticket_id}/status")
def update_status(
    request: Request,
    ticket_id: int,
    status: str = Form(...),
    db: Session = Depends(get_db),
):
    user = require_user(request, db)
    if isinstance(user, Response):
        return user
    if user.profile != "Suporte":
        return flash_redirect("/tickets", "Apenas suporte pode alterar status.", "warning")
    ticket = db.get(Ticket, ticket_id)
    if not ticket or status not in STATUSES:
        return flash_redirect("/tickets", "Não foi possível atualizar o chamado.", "warning")
    old_status = ticket.status
    ticket.status = status
    write_log(db, user, "STATUS_CHANGED", f"Status de '{ticket.code}' mudou de '{old_status}' para '{status}'.")
    db.commit()
    return flash_redirect(f"/tickets/{ticket.id}", "Status atualizado.", "success")


@app.get("/users", response_class=HTMLResponse)
def users_page(request: Request, db: Session = Depends(get_db)):
    user = require_user(request, db)
    if isinstance(user, Response):
        return user
    if user.profile != "Suporte":
        return flash_redirect("/tickets", "Acesso restrito ao suporte.", "warning")
    users = db.scalars(select(User).order_by(User.username)).all()
    return render(request, "users.html", {"user": user, "users": users})


@app.post("/users")
def save_user(
    request: Request,
    username: str = Form(...),
    password: str = Form(""),
    hotel: str = Form(...),
    profile: str = Form(...),
    user_id: int = Form(0),
    db: Session = Depends(get_db),
):
    user = require_user(request, db)
    if isinstance(user, Response):
        return user
    if user.profile != "Suporte":
        return flash_redirect("/tickets", "Acesso restrito ao suporte.", "warning")
    if profile not in PROFILES:
        return flash_redirect("/users", "Perfil inválido.", "warning")

    target = db.get(User, user_id) if user_id else None
    existing = db.scalar(select(User).where(User.username == username.strip(), User.id != user_id))
    if existing:
        return flash_redirect("/users", "Já existe um usuário com esse nome.", "warning")

    if target:
        target.username = username.strip()
        target.hotel = hotel.strip()
        target.profile = profile
        if password.strip():
            target.password_hash = hash_password(password)
        write_log(db, user, "USER_UPDATED", f"Editou o usuário '{target.username}'.")
    else:
        if not password.strip():
            return flash_redirect("/users", "Informe uma senha para novo usuário.", "warning")
        target = User(username=username.strip(), password_hash=hash_password(password), hotel=hotel.strip(), profile=profile)
        db.add(target)
        write_log(db, user, "USER_CREATED", f"Criou o usuário '{target.username}'.")
    db.commit()
    return flash_redirect("/users", "Usuário salvo.", "success")


@app.post("/users/{user_id}/delete")
def delete_user(request: Request, user_id: int, db: Session = Depends(get_db)):
    user = require_user(request, db)
    if isinstance(user, Response):
        return user
    if user.profile != "Suporte":
        return flash_redirect("/tickets", "Acesso restrito ao suporte.", "warning")
    if user.id == user_id:
        return flash_redirect("/users", "Você não pode excluir seu próprio usuário.", "warning")
    target = db.get(User, user_id)
    if target:
        has_tickets = db.scalar(select(Ticket.id).where(Ticket.requester_id == target.id).limit(1))
        if has_tickets:
            return flash_redirect("/users", "Usuário possui chamados e não pode ser excluído.", "warning")
        write_log(db, user, "USER_DELETED", f"Excluiu o usuário '{target.username}'.")
        db.delete(target)
        db.commit()
    return flash_redirect("/users", "Usuário excluído.", "success")
