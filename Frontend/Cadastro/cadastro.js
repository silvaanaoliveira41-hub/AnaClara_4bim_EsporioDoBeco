
// Aguarda o HTML carregar completamente
document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('form-cadastro');

    // Verifica se o formulário existe
    if (formulario) {
        formulario.addEventListener('submit', cadastrarCliente);
    }
});

// Função responsável por realizar o cadastro
async function cadastrarCliente(evento) {
    // Impede que a página seja recarregada
    evento.preventDefault();

    // Captura os valores digitados no formulário
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;

    // Verifica se os campos foram preenchidos
    if (!nome || !email || !senha) {
        alert('Preencha todos os campos!');
        return;
    }

    // Verifica o tamanho mínimo da senha
    if (senha.length < 8) {
        alert('A senha deve ter pelo menos 8 caracteres.');
        return;
    }

    try {
        // Envia os dados para o backend
        const resposta = await fetch('http://localhost:3001/cadastro', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: nome,
                email: email,
                senha: senha
            })
        });

        // Recebe a resposta do servidor como texto
        const textoResposta = await resposta.text();

        console.log('Resposta do servidor:', textoResposta);

        // Converte a resposta para JSON
        let dados = {};

        try {
            dados = textoResposta ? JSON.parse(textoResposta) : {};
        } catch (erro) {
            console.error('Resposta inválida do servidor:', erro);
            alert('O servidor retornou uma resposta inválida.');
            return;
        }

        // Verifica se o cadastro foi realizado
        if (!resposta.ok) {
            alert(dados.mensagem || 'Não foi possível realizar o cadastro.');
            return;
        }

        // Mostra mensagem de sucesso
        alert(dados.mensagem || 'Cadastro realizado com sucesso!');

        // Redireciona para o menu
        window.location.href = '../menu/menu.html';

    } catch (erro) {
        // Mostra erros de conexão
        console.error('Erro ao realizar cadastro:', erro);
        alert('Não foi possível conectar ao servidor.');
    }
}
