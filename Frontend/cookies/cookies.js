(function iniciarAvisoCookies() {
    const CHAVE_CONSENTIMENTO = 'emporio_cookies_preferencia';
    const escolhaSalva = localStorage.getItem(CHAVE_CONSENTIMENTO);

    if (escolhaSalva) {
        aplicarPreferenciaCookies(escolhaSalva);
        return;
    }

    const estilo = document.createElement('style');
    estilo.textContent = `
        .banner-cookies {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 92%;
            max-width: 820px;
            background: linear-gradient(145deg, #211333, #140b22);
            border: 1px solid #e2c078;
            border-radius: 14px;
            padding: 20px 24px;
            box-shadow: 0 12px 35px rgba(0, 0, 0, 0.65), 0 0 20px rgba(198, 167, 255, 0.15);
            z-index: 9999;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            font-family: Georgia, serif;
            color: #faf5ff;
            animation: surgirCookies 0.45s ease;
        }

        @keyframes surgirCookies {
            from { opacity: 0; transform: translate(-50%, 25px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }

        .banner-cookies-texto {
            flex: 1 1 380px;
        }

        .banner-cookies-texto h4 {
            color: #ffe7a8;
            font-size: 16px;
            margin-bottom: 6px;
        }

        .banner-cookies-texto p {
            color: #d0c2e3;
            font-size: 13px;
            line-height: 1.5;
        }

        .banner-cookies-acoes {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .btn-cookie-essencial {
            background: transparent;
            color: #c6a7ff;
            border: 1px solid #543b70;
            padding: 10px 16px;
            border-radius: 8px;
            font-family: Georgia, serif;
            font-size: 13px;
            cursor: pointer;
            transition: 0.25s;
        }

        .btn-cookie-essencial:hover {
            border-color: #c6a7ff;
            color: #faf5ff;
        }

        .btn-cookie-aceitar {
            background: #7045a0;
            color: #ffffff;
            border: 1px solid #e2c078;
            padding: 10px 18px;
            border-radius: 8px;
            font-family: Georgia, serif;
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
            transition: 0.25s;
        }

        .btn-cookie-aceitar:hover {
            background: #875bb8;
            transform: translateY(-2px);
        }
    `;
    document.head.appendChild(estilo);

    const banner = document.createElement('aside');
    banner.className = 'banner-cookies';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Aviso de Cookies');
    banner.innerHTML = `
        <div class="banner-cookies-texto">
            <h4>✦ Poções & Cookies do Empório</h4>
            <p>
                Utilizamos cookies essenciais para manter sua sessão e login funcionando com segurança.
                Você pode aceitar cookies adicionais de personalização ou manter apenas os essenciais.
            </p>
        </div>
        <div class="banner-cookies-acoes">
            <button type="button" id="cookie-recusar" class="btn-cookie-essencial">
                Apenas essenciais
            </button>
            <button type="button" id="cookie-aceitar" class="btn-cookie-aceitar">
                Aceitar todos ✦
            </button>
        </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('cookie-aceitar').addEventListener('click', () => {
        salvarEscolha('todos');
        banner.remove();
    });

    document.getElementById('cookie-recusar').addEventListener('click', () => {
        salvarEscolha('essenciais');
        banner.remove();
    });

    function salvarEscolha(tipo) {
        localStorage.setItem(CHAVE_CONSENTIMENTO, tipo);
        aplicarPreferenciaCookies(tipo);
    }

    function aplicarPreferenciaCookies(tipo) {
        if (tipo === 'todos') {
            window.COOKIES_NAO_ESSENCIAIS_PERMITIDOS = true;
        } else {
            window.COOKIES_NAO_ESSENCIAIS_PERMITIDOS = false;
            document.cookie.split(';').forEach((c) => {
                const nome = c.split('=')[0].trim();
                if (nome && nome !== 'connect.sid') {
                    document.cookie = `${nome}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
                }
            });
        }
    }
})();