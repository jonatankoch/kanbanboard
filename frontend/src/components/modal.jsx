// src/components/Modal.jsx

function Modal({ title, children, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose} // Klick auf Overlay schließt
    >
      <div
        style={{
          background: "#111827",          // dunkle Karte statt weiß
          color: "#f9fafb",               // helle Schrift
          borderRadius: 12,
          padding: 20,
          minWidth: 320,
          maxWidth: 480,                  // nicht zu breit
          width: "90%",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          border: "1px solid #374151",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()} // Klick IN der Karte NICHT schließen
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          {title && (
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              {title}
            </h2>
          )}

          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: "#9ca3af",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: 4,
            }}
            title="Schließen"
          >
            ×
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}

export default Modal;
