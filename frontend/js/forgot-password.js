document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgotPasswordForm');
    const message = document.getElementById('message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();

        message.textContent = 'Sending...';

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            message.textContent = data.message || 'Request completed.';
        } catch (error) {
            console.error(error);
            message.textContent = 'Server error. Please try again.';
        }
    });
});