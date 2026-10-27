"use client";

// Último recurso: erro no layout raiz. Precisa do próprio <html> e não usa o CSS do app.
export default function ErroGlobal({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          margin: 0,
          padding: 16,
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 20 }}>Algo deu errado</h1>
          <p style={{ color: "#555" }}>Não foi possível carregar o Ascend.</p>
          <button
            onClick={() => retry()}
            style={{
              marginTop: 16,
              padding: "10px 20px",
              fontSize: 16,
              borderRadius: 8,
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
