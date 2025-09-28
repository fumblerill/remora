export default function LoginPage() {
  return (
    <div className="w-full max-w-md bg-white shadow-md rounded-lg p-8">
      <h2 className="text-2xl font-bold text-brand mb-6 text-center">
        Вход в Remora
      </h2>
      <form className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Логин"
          className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <input
          type="password"
          placeholder="Пароль"
          className="border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <button
          type="submit"
          className="bg-brand text-white py-2 rounded-lg hover:bg-brand/90 transition"
        >
          Войти
        </button>
      </form>
    </div>
  );
}
