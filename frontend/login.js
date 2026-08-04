document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const erroLogin = document.getElementById('erroLogin');
    const btnEntrar = document.getElementById('btnEntrar');
    const usuarioInput = document.getElementById('usuario');
    const senhaInput = document.getElementById('senha');

    if (!form || !erroLogin || !btnEntrar || !usuarioInput || !senhaInput) {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        erroLogin.style.display = 'none';
        btnEntrar.disabled = true;
        btnEntrar.textContent = 'VALIDANDO...';

        try {
            const resposta = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    login: usuarioInput.value.trim(),
                    senha: senhaInput.value
                })
            });

            const dados = await resposta.json().catch(() => ({}));

            if (resposta.ok && dados.sucesso) {
                const destino = dados.redirecionarPara || '/index.html';
                window.location.href = destino;
                return;
            }

            erroLogin.textContent = dados.mensagem || 'Usuário ou senha incorretos.';
            erroLogin.style.display = 'block';
        } catch (error) {
            erroLogin.textContent = 'Não foi possível comunicar com o servidor.';
            erroLogin.style.display = 'block';
        } finally {
            btnEntrar.disabled = false;
            btnEntrar.textContent = 'ENTRAR';
        }
    });
});
