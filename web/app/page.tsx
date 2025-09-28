import Header from "../components/layout/Header";

export default function HomePage() {
  const configs: { id: number; name: string; date: string }[] = [];

  return (
    <div>
      <Header />

      <div className="mt-6">
        {configs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {configs.map((cfg) => (
              <div
                key={cfg.id}
                className="bg-white shadow-sm border rounded-lg p-4 hover:shadow-md transition"
              >
                <h3 className="text-lg font-semibold text-brand">{cfg.name}</h3>
                <p className="text-sm text-gray-500">Создан: {cfg.date}</p>
                <button className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-sm py-2 rounded">
                  Открыть
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center">Конфигурации ещё не загружены.</p>
        )}
      </div>
    </div>
  );
}
