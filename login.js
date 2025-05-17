// Foydalanuvchi ma'lumotlari
const users = [
  { username: 'admin', password: 'Admin123!', role: 'admin' },
  { username: 'user', password: 'user123', role: 'user' }
];

document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('loginForm');
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  const rememberCheckbox = document.getElementById('remember');

  // Eslab qolingan ma'lumotlarni tekshirish
  const rememberedUser = localStorage.getItem('rememberedUser');
  if (rememberedUser) {
    const user = JSON.parse(rememberedUser);
    document.getElementById('username').value = user.username;
    document.getElementById('password').value = user.password;
    rememberCheckbox.checked = true;
  }

  // Parolni ko'rsatish/yashirish
  togglePassword.addEventListener('click', function () {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);

    // Ko'z ikonkasini o'zgartirish
    const icon = this.querySelector('i');
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
  });

  // Login formani yuborish
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = passwordInput.value;
    const remember = rememberCheckbox.checked;

    // Foydalanuvchini tekshirish
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
      // Eslab qolish
      if (remember) {
        localStorage.setItem('rememberedUser', JSON.stringify({
          username: username,
          password: password
        }));
      } else {
        localStorage.removeItem('rememberedUser');
      }

      // Sessiyani saqlash
      sessionStorage.setItem('currentUser', JSON.stringify({
        username: user.username,
        role: user.role
      }));

      // Asosiy sahifaga yo'naltirish
      window.location.href = 'index.html';
    } else {
      alert('Login yoki parol noto\'g\'ri!');
    }
  });
}); 