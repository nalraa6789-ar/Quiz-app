document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('resetPasswordForm');
    const message = document.getElementById('message');

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
        message.textContent = 'Invalid or missing reset token.';
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            message.textContent = 'Passwords do not match.';
            return;
        }

        message.textContent = 'Resetting password...';

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    password
                })
            });

            const data = await response.json();

            message.textContent =
                data.message || 'Password reset completed.';

            if (response.ok) {
                form.reset();

                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            }

        } catch (error) {
            console.error(error);
            message.textContent = 'Server error. Please try again.';
        }
    });
});