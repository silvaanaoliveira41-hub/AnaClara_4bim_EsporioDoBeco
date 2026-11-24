document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', realizarLogin);
    }
});

async function realizarLogin(evento) {
    evento.preventDefault();

    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;

    if (!email || !senha) {
        alert('Preencha o email e a senha.');
        return;
    }

    try {
        const resposta = await fetch('http://localhost:3001/login', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                senha: senha
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(dados.mensagem || 'Erro ao realizar login.');
            return;
        }

        const tipoUsuario = dados.usuario.tipo_usuario;

        sessionStorage.setItem('usuarioLogado', JSON.stringify(dados.usuario));
        if (dados.token) {
            sessionStorage.setItem('authToken', dados.token);
        }

        if (tipoUsuario === 'administrador') {
            alert('Bem-vindo ao painel administrativo!');
            window.location.replace('../administrador/administrador.html');
        } else if (tipoUsuario === 'cliente') {
            alert('Bem-vindo ao Empório Mágico do Beco!');
            window.location.replace('../menu/menu.html');
        } else {
            alert('Tipo de usuário não reconhecido.');
        }

    } catch (erro) {
        console.error('Erro no login:', erro);
        alert('Não foi possível conectar ao servidor.');
    }
}