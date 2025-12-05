import { useEffect, useState } from "react";
import axios from "axios";
import Modal from "./components/modal";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const iconButtonStyle = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: 4,
  borderRadius: 4,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 16,
};

const primaryButtonStyle = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #555",
  background: "#222",
  color: "#f5f5f5",
  cursor: "pointer",
  fontSize: 14,
};

// Admin-Panel als eigene Komponente
function AdminPanel({ users, currentUser, onUpdateUser, onResetPassword }) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
        border: "1px solid #374151",
        background: "#020617",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 18 }}>
        Admin · Benutzerverwaltung
      </h2>
      <p style={{ fontSize: 13, opacity: 0.8, marginTop: 0, marginBottom: 12 }}>
        Hier kannst du Accounts freischalten und Berechtigungen setzen.
      </p>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Name</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>E-Mail</th>
              <th style={{ padding: "6px 8px" }}>Aktiv</th>
              <th style={{ padding: "6px 8px" }}>Sehen</th>
              <th style={{ padding: "6px 8px" }}>Bearbeiten</th>
              <th style={{ padding: "6px 8px" }}>Löschen</th>
              <th style={{ padding: "6px 8px" }}>Admin</th>
              <th style={{ padding: "6px 8px" }}>PW-Reset</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = currentUser && currentUser.id === u.id;
              return (
                <tr
                  key={u.id}
                  style={{
                    borderTop: "1px solid #1f2937",
                    background:
                      isSelf && u.is_admin ? "rgba(56,189,248,0.05)" : "none",
                  }}
                >
                  <td style={{ padding: "6px 8px" }}>
                    {u.name}
                    {isSelf && (
                      <span style={{ fontSize: 11, opacity: 0.7 }}> (du)</span>
                    )}
                  </td>
                  <td style={{ padding: "6px 8px", opacity: 0.8 }}>
                    {u.email || "—"}
                  </td>
                  {[
                    "is_active",
                    "can_view",
                    "can_edit",
                    "can_delete",
                    "is_admin",
                  ].map((field) => (
                    <td
                      key={field}
                      style={{ textAlign: "center", padding: "6px 8px" }}
                    >
                      <input
                        type="checkbox"
                        checked={u[field]}
                        onChange={(e) =>
                          onUpdateUser(u.id, { [field]: e.target.checked })
                        }
                        disabled={
                          isSelf && (field === "is_active" || field === "is_admin")
                        }
                      />
                    </td>
                  ))}
                  <td style={{ textAlign: "center", padding: "6px 8px" }}>
                    <button
                      style={{
                        ...primaryButtonStyle,
                        padding: "2px 6px",
                        fontSize: 11,
                      }}
                      onClick={() => {
                        const temp = window.prompt(
                          `Neues temporäres Passwort für "${u.name}" eingeben:`
                        );
                        if (!temp) return;
                        onResetPassword(u.id, temp);
                      }}
                      disabled={!currentUser?.is_admin}
                    >
                      Reset
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function App() {
  const [boards, setBoards] = useState([]);
  const [currentBoardId, setCurrentBoardId] = useState(null);

  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);

  // Auth / User (mit localStorage)
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem("currentUser");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [authError, setAuthError] = useState("");

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Passwort-Änderung nach Login
  const [showPwChangeModal, setShowPwChangeModal] = useState(false);
  const [pwChangeNew, setPwChangeNew] = useState("");
  const [pwChangeNew2, setPwChangeNew2] = useState("");
  const [pwChangeError, setPwChangeError] = useState("");

  // Board-Modal (neu anlegen)
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardColor, setNewBoardColor] = useState("#111827");

  // Board bearbeiten
  const [editingBoard, setEditingBoard] = useState(null);
  const [editBoardName, setEditBoardName] = useState("");
  const [editBoardColor, setEditBoardColor] = useState("#111827");

  // Column-Modal
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("#181818");

  // Card-Modal
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardTitle, setCardTitle] = useState("");
  const [cardDescription, setCardDescription] = useState("");
  const [cardDueDate, setCardDueDate] = useState("");
  const [cardColor, setCardColor] = useState("#6b7280");
  const [cardAssigneeId, setCardAssigneeId] = useState(null);
  const [cardLink, setCardLink] = useState(""); // Link-Feld
  const [selectedColumn, setSelectedColumn] = useState(null);

  // Edit-States
  const [editingCard, setEditingCard] = useState(null);
  const [editingColumn, setEditingColumn] = useState(null);
  const [editColumnTitle, setEditColumnTitle] = useState("");
  const [editColumnColor, setEditColumnColor] = useState("#181818");

  // Card-History
  const [cardHistory, setCardHistory] = useState([]);

  // Ansicht: Boards oder Admin
  const [viewMode, setViewMode] = useState("boards");
  // Konstruktionsmodus für Spalten-/Board-Struktur
  const [buildMode, setBuildMode] = useState(false);

  // Drag-Status für Spalten
  const [draggedColumnId, setDraggedColumnId] = useState(null);
  const [columnDragOverId, setColumnDragOverId] = useState(null);

  // Rechte
  const canView = currentUser ? currentUser.can_view : true;
  const canEdit = currentUser ? currentUser.can_edit : false;
  const canDelete = currentUser ? currentUser.can_delete : false;
  const isAdmin = currentUser ? currentUser.is_admin : false;

  // ----- Axios: aktuellen User in Header setzen -----
  useEffect(() => {
    if (currentUser) {
      axios.defaults.headers.common["X-User-Id"] = currentUser.id;
    } else {
      delete axios.defaults.headers.common["X-User-Id"];
    }
  }, [currentUser]);

  // -------- Daten laden --------
  const loadColumnsAndCards = async (boardId) => {
    const colRes = await axios.get(`${API_URL}/boards/${boardId}/columns`);
    const cardRes = await axios.get(`${API_URL}/cards/`);
    setColumns(colRes.data);
    setCards(cardRes.data);
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const usersRes = await axios.get(`${API_URL}/users/`);
        setUsers(usersRes.data);

        const boardsRes = await axios.get(`${API_URL}/boards/`);
        const boardsData = boardsRes.data;
        setBoards(boardsData);

        if (boardsData.length > 0) {
          const firstId = boardsData[0].id;
          setCurrentBoardId(firstId);
          await loadColumnsAndCards(firstId);
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    init();
  }, []);

  const persistCurrentUser = (userOrNull) => {
    if (typeof window === "undefined") return;
    if (userOrNull) {
      window.localStorage.setItem("currentUser", JSON.stringify(userOrNull));
    } else {
      window.localStorage.removeItem("currentUser");
    }
  };

  // -------- Auth --------

  const openRegisterModal = () => {
    setRegName("");
    setRegEmail("");
    setRegPassword("");
    setAuthError("");
    setShowRegisterModal(true);
  };

  const openLoginModal = () => {
    setLoginName("");
    setLoginPassword("");
    setAuthError("");
    setShowLoginModal(true);
  };

  const handleRegister = async () => {
    if (!regName.trim() || !regPassword.trim()) {
      setAuthError("Name und Passwort dürfen nicht leer sein.");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/users/`, {
        name: regName.trim(),
        email: regEmail.trim() || null,
        password: regPassword,
      });
      const newUser = res.data;
      setUsers((prev) => [...prev, newUser]);
      if (newUser.is_active) {
        setCurrentUser(newUser);
        persistCurrentUser(newUser);
      }
      setShowRegisterModal(false);
      setAuthError("");
    } catch (e) {
      console.error(e);
      setAuthError("Registrierung fehlgeschlagen (Name evtl. schon vergeben).");
    }
  };

  const handleLogin = async () => {
    if (!loginName.trim() || !loginPassword.trim()) {
      setAuthError("Name und Passwort dürfen nicht leer sein.");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/login`, {
        name: loginName.trim(),
        password: loginPassword,
      });
      setCurrentUser(res.data);
      persistCurrentUser(res.data);
      setShowLoginModal(false);
      setAuthError("");

      // Pflicht-Passwortwechsel?
      if (res.data.must_change_password) {
        setPwChangeNew("");
        setPwChangeNew2("");
        setPwChangeError("");
        setShowPwChangeModal(true);
      }
    } catch (e) {
      console.error(e);
      if (e.response?.status === 403) {
        setAuthError("Dein Account wurde noch nicht vom Admin freigeschaltet.");
      } else if (e.response?.status === 401) {
        setAuthError("Login fehlgeschlagen. Bitte Zugangsdaten prüfen.");
      } else {
        const msg =
          e.response?.data?.detail ||
          e.response?.data?.message ||
          "Es ist ein Fehler beim Login aufgetreten.";
        setAuthError(msg);
      }
      persistCurrentUser(null);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    persistCurrentUser(null);
    setViewMode("boards");
    setBuildMode(false);
  };

  const handleUpdateUser = async (userId, partial) => {
    try {
      const res = await axios.patch(`${API_URL}/users/${userId}`, partial);
      const updatedUser = res.data;
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? updatedUser : u))
      );
      if (currentUser && currentUser.id === userId) {
        setCurrentUser(updatedUser);
        persistCurrentUser(updatedUser);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdminResetPassword = async (userId, newPassword) => {
    try {
      const res = await axios.post(
        `${API_URL}/users/${userId}/reset_password`,
        { new_password: newPassword }
      );
      const updatedUser = res.data;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? updatedUser : u))
      );

      if (currentUser && currentUser.id === userId) {
        setCurrentUser(updatedUser);
        persistCurrentUser(updatedUser);
      }
    } catch (e) {
      console.error(e);
      alert("Passwort-Reset fehlgeschlagen.");
    }
  };

  const handleChangePassword = async () => {
    if (!currentUser) return;
    if (!pwChangeNew.trim() || !pwChangeNew2.trim()) {
      setPwChangeError("Bitte beide Passwort-Felder ausfüllen.");
      return;
    }
    if (pwChangeNew !== pwChangeNew2) {
      setPwChangeError("Die Passwörter stimmen nicht überein.");
      return;
    }
    if (pwChangeNew.length < 6) {
      setPwChangeError("Das Passwort sollte mindestens 6 Zeichen haben.");
      return;
    }

    try {
      const res = await axios.post(
        `${API_URL}/users/${currentUser.id}/change_password`,
        { new_password: pwChangeNew }
      );

      setCurrentUser(res.data);
      persistCurrentUser(res.data);
      setShowPwChangeModal(false);
      setPwChangeError("");
      setPwChangeNew("");
      setPwChangeNew2("");
    } catch (e) {
      console.error(e);
      setPwChangeError("Passwort konnte nicht geändert werden.");
    }
  };

  // -------- Boards --------

  const openNewBoardModal = () => {
    if (!canEdit || !isAdmin || !buildMode) return;
    setNewBoardName("");
    setNewBoardColor("#111827");
    setShowBoardModal(true);
  };

  const createBoard = async () => {
    if (!newBoardName.trim()) return;
    const res = await axios.post(`${API_URL}/boards/`, {
      name: newBoardName,
      color: newBoardColor || null,
    });
    const newBoard = res.data;
    const updated = [...boards, newBoard];
    setBoards(updated);
    setShowBoardModal(false);
    setCurrentBoardId(newBoard.id);
    setLoading(true);
    await loadColumnsAndCards(newBoard.id);
  };

  const selectBoard = async (boardId) => {
    if (boardId === currentBoardId) return;
    setCurrentBoardId(boardId);
    setLoading(true);
    await loadColumnsAndCards(boardId);
  };

  const saveBoardChanges = async () => {
    if (!editingBoard || !canEdit || !isAdmin) return;
    try {
      const res = await axios.patch(`${API_URL}/boards/${editingBoard.id}`, {
        name: editBoardName,
        color: editBoardColor,
      });
      const updated = res.data;
      setBoards((prev) =>
        prev.map((b) => (b.id === editingBoard.id ? updated : b))
      );
      setEditingBoard(null);
    } catch (e) {
      console.error(e);
    }
  };

  // -------- Columns --------

  const openNewColumnModal = () => {
    if (!buildMode || !canEdit || !isAdmin) return;
    if (!currentBoardId) {
      alert("Bitte zuerst ein Board anlegen.");
      return;
    }
    setNewColumnTitle("");
    setNewColumnColor("#181818");
    setShowColumnModal(true);
  };

  const createColumn = async () => {
    if (!newColumnTitle.trim() || !currentBoardId) return;
    if (!buildMode || !canEdit || !isAdmin) return;

    const res = await axios.post(`${API_URL}/columns/`, {
      title: newColumnTitle,
      position: columns.length + 1,
      board_id: currentBoardId,
      color: newColumnColor || null,
    });
    setColumns((prev) => [...prev, res.data]);
    setShowColumnModal(false);
  };

  const openEditColumn = (col) => {
    if (!buildMode || !canEdit || !isAdmin) return;
    setEditingColumn(col);
    setEditColumnTitle(col.title);
    setEditColumnColor(col.color || "#181818");
  };

  const saveColumnChanges = async () => {
    if (!editingColumn || !buildMode || !canEdit || !isAdmin) return;
    const res = await axios.patch(`${API_URL}/columns/${editingColumn.id}`, {
      title: editColumnTitle,
      color: editColumnColor,
    });
    setColumns((prev) =>
      prev.map((c) => (c.id === editingColumn.id ? res.data : c))
    );
    setEditingColumn(null);
  };

  const deleteColumnFromModal = async () => {
    if (!editingColumn || !buildMode || !canDelete || !isAdmin) return;
    if (!window.confirm("Spalte und alle Karten darin wirklich löschen?"))
      return;

    await axios.delete(`${API_URL}/columns/${editingColumn.id}`);
    setColumns((prev) => prev.filter((c) => c.id !== editingColumn.id));
    setCards((prev) => prev.filter((card) => card.column_id !== editingColumn.id));
    setEditingColumn(null);
  };

  // -------- Cards & History --------

  const openNewCardModal = (columnId) => {
    if (!canEdit) return;
    setSelectedColumn(columnId);
    setCardTitle("");
    setCardDescription("");
    setCardDueDate("");
    setCardColor("#6b7280");
    setCardAssigneeId(currentUser ? currentUser.id : null);
    setCardLink("");
    setCardHistory([]);
    setShowCardModal(true);
  };

  const createCard = async () => {
    if (!cardTitle.trim() || !selectedColumn || !canEdit) return;

    const dueDateISO = cardDueDate ? new Date(cardDueDate).toISOString() : null;

    const res = await axios.post(`${API_URL}/cards/`, {
      title: cardTitle,
      description: cardDescription || null,
      due_date: dueDateISO,
      column_id: selectedColumn,
      color: cardColor || null,
      assignee_id: cardAssigneeId || null,
      link: cardLink || null,
    });

    setCards((prev) => [...prev, res.data]);
    setShowCardModal(false);
    setCardHistory([]);
  };

  const loadCardHistory = async (cardId) => {
    try {
      const res = await axios.get(`${API_URL}/cards/${cardId}/history`);
      setCardHistory(res.data);
    } catch (e) {
      console.error(e);
      setCardHistory([]);
    }
  };

  const openEditCard = async (card) => {
    if (!canEdit) return;
    setEditingCard(card);
    setCardTitle(card.title);
    setCardDescription(card.description || "");
    setCardDueDate(card.due_date ? card.due_date.substring(0, 10) : "");
    setCardColor(card.color || "#6b7280");
    setCardAssigneeId(card.assignee_id || null);
    setCardLink(card.link || "");
    setCardHistory([]);
    await loadCardHistory(card.id);
  };

  const saveCardChanges = async () => {
    if (!editingCard || !canEdit) return;

    const dueDateISO = cardDueDate ? new Date(cardDueDate).toISOString() : null;

    const res = await axios.patch(`${API_URL}/cards/${editingCard.id}`, {
      title: cardTitle,
      description: cardDescription || null,
      due_date: dueDateISO,
      column_id: editingCard.column_id,
      color: cardColor || null,
      assignee_id: cardAssigneeId || null,
      link: cardLink || null,
    });

    setCards((prev) =>
      prev.map((c) => (c.id === editingCard.id ? res.data : c))
    );
    setEditingCard(null);
    setCardHistory([]);
  };

  const deleteCard = async (cardId) => {
    if (!canDelete) return;
    if (!window.confirm("Karte wirklich löschen?")) return;
    await axios.delete(`${API_URL}/cards/${cardId}`);
    setCards((prev) => prev.filter((c) => c.id !== cardId));
  };

  // -------- Drag & Drop --------

  const handleDropOnColumn = async (event, columnId) => {
    event.preventDefault();
    if (!canEdit || buildMode) return;

    const cardIdStr = event.dataTransfer.getData("text/kanban-card");
    const fallback = event.dataTransfer.getData("text/plain");
    const cardId = Number(cardIdStr || fallback);
    if (!cardId) return;

    const card = cards.find((c) => c.id === cardId);
    if (!card || card.column_id === columnId) return;

    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              column_id: columnId,
            }
          : c
      )
    );

    try {
      await axios.patch(`${API_URL}/cards/${cardId}`, {
        column_id: columnId,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleColumnDragStart = (event, columnId) => {
    if (!canEdit || !buildMode || !isAdmin) return;
    event.dataTransfer.setData("text/kanban-column", columnId.toString());
    event.dataTransfer.effectAllowed = "move";
    setDraggedColumnId(columnId);
    setColumnDragOverId(null);
  };

  const handleColumnDrop = async (event, targetColumnId) => {
    event.preventDefault();
    if (!canEdit || !buildMode || !isAdmin) return;

    const draggedIdStr = event.dataTransfer.getData("text/kanban-column");
    const draggedId = Number(draggedIdStr);
    if (!draggedId || draggedId === targetColumnId) return;

    const sorted = [...columns].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0)
    );

    const draggedIndex = sorted.findIndex((c) => c.id === draggedId);
    const targetIndex = sorted.findIndex((c) => c.id === targetColumnId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const [dragged] = sorted.splice(draggedIndex, 1);
    sorted.splice(targetIndex, 0, dragged);

    const updated = sorted.map((c, index) => ({
      ...c,
      position: index + 1,
    }));

    setColumns(updated);

    try {
      for (const col of updated) {
        await axios.patch(`${API_URL}/columns/${col.id}`, {
          position: col.position,
        });
      }
    } catch (e) {
      console.error("Fehler beim Speichern der Spaltenreihenfolge", e);
    }

    setDraggedColumnId(null);
    setColumnDragOverId(null);
  };

  if (loading) return <div style={{ padding: 20 }}>Lade…</div>;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111",
        color: "#f5f5f5",
      }}
    >
      <div
        style={{
          padding: "16px 24px 32px",
          boxSizing: "border-box",
          maxWidth: "100%",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            gap: 8,
          }}
        >
          <div style={{ fontSize: 18, opacity: 0.8 }}>
            {viewMode === "boards" ? (
              currentBoardId ? (
                <span
                  style={{
                    cursor:
                      isAdmin && canEdit && buildMode ? "pointer" : "default",
                    textDecoration:
                      isAdmin && canEdit && buildMode
                        ? "underline dotted"
                        : "none",
                  }}
                  title={
                    isAdmin && canEdit && buildMode
                      ? "Board umbenennen"
                      : undefined
                  }
                  onClick={() => {
                    if (!(isAdmin && canEdit && buildMode)) return;
                    const b = boards.find((bb) => bb.id === currentBoardId);
                    if (!b) return;
                    setEditingBoard(b);
                    setEditBoardName(b.name);
                    setEditBoardColor(b.color || "#111827");
                  }}
                >
                  {boards.find((b) => b.id === currentBoardId)?.name || "Board"}
                </span>
              ) : (
                "Kein Board ausgewählt"
              )
            ) : (
              "Admin-Bereich"
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
            }}
          >
            {currentUser ? (
              <>
                <span>
                  Angemeldet als <strong>{currentUser.name}</strong>
                  {currentUser.is_admin && (
                    <span style={{ fontSize: 11, opacity: 0.7 }}> (Admin)</span>
                  )}
                </span>

                {isAdmin && viewMode === "boards" && (
                  <button
                    style={{
                      ...primaryButtonStyle,
                      background: buildMode ? "#7f1d1d" : "#1f2937",
                      borderColor: buildMode ? "#f97316" : "#4b5563",
                    }}
                    onClick={() => setBuildMode((v) => !v)}
                    title="Spalten- und Boardstruktur bearbeiten"
                  >
                    {buildMode ? "Konstruktionsmodus: AN" : "Konstruktionsmodus"}
                  </button>
                )}

                {isAdmin && (
                  <>
                    {viewMode === "boards" ? (
                      <button
                        style={primaryButtonStyle}
                        onClick={() => {
                          setViewMode("admin");
                          setBuildMode(false);
                        }}
                      >
                        Admin-Bereich
                      </button>
                    ) : (
                      <button
                        style={primaryButtonStyle}
                        onClick={() => setViewMode("boards")}
                      >
                        Zurück zum Board
                      </button>
                    )}
                  </>
                )}

                <button style={primaryButtonStyle} onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <button style={primaryButtonStyle} onClick={openLoginModal}>
                  Login
                </button>
                <button
                  style={primaryButtonStyle}
                  onClick={openRegisterModal}
                >
                  Registrieren
                </button>
              </>
            )}
          </div>
        </div>

        {viewMode === "boards" && currentUser && !canView && (
          <p style={{ fontSize: 13, color: "#f97316", marginTop: 0 }}>
            Du bist angemeldet, hast aber aktuell keine Berechtigung, Boards zu
            sehen. Bitte Admin kontaktieren.
          </p>
        )}

        {/* Board-Ansicht */}
        {viewMode === "boards" && (
          <>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 16,
                alignItems: "center",
              }}
            >
              {boards.map((board) => (
                <button
                  key={board.id}
                  onClick={() => selectBoard(board.id)}
                  style={{
                    ...primaryButtonStyle,
                    background:
                      board.id === currentBoardId
                        ? "#4c1d95"
                        : board.color || "#222",
                    borderColor:
                      board.id === currentBoardId ? "#a855f7" : "#555",
                  }}
                >
                  {board.name}
                </button>
              ))}
              {isAdmin && canEdit && buildMode && (
                <button
                  onClick={openNewBoardModal}
                  style={{
                    ...primaryButtonStyle,
                    background: "#111827",
                    borderColor: "#4b5563",
                  }}
                >
                  + Board
                </button>
              )}
            </div>

            {!currentBoardId && (
              <p>
                Kein Board vorhanden.{" "}
                {isAdmin &&
                  canEdit &&
                  "Wechsle in den Konstruktionsmodus und lege ein neues Board an."}
              </p>
            )}

            {currentBoardId && canView && (
              <>
                {isAdmin && canEdit && buildMode && (
                  <button
                    style={primaryButtonStyle}
                    onClick={openNewColumnModal}
                  >
                    + Neue Spalte
                  </button>
                )}

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 16,
                    marginTop: 16,
                    alignItems: "flex-start",
                    maxWidth: "100%",
                  }}
                >
                  {[...columns]
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                    .map((col) => {
                      const isDragOver =
                        buildMode &&
                        isAdmin &&
                        canEdit &&
                        columnDragOverId === col.id;
                      const isDragged =
                        buildMode &&
                        isAdmin &&
                        canEdit &&
                        draggedColumnId === col.id;

                      return (
                        <div
                          key={col.id}
                          style={{
                            padding: 10,
                            border: isDragOver
                              ? "2px solid #facc15"
                              : "1px solid #333",
                            borderRadius: 10,
                            background: col.color || "#181818",
                            boxShadow: isDragOver
                              ? "0 0 0 2px rgba(250,204,21,0.35)"
                              : "none",
                            opacity: isDragged ? 0.6 : 1,
                            transition:
                              "border 0.12s ease, box-shadow 0.12s ease, opacity 0.12s",
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (
                              buildMode &&
                              isAdmin &&
                              canEdit &&
                              draggedColumnId &&
                              draggedColumnId !== col.id
                            ) {
                              setColumnDragOverId(col.id);
                            }
                          }}
                          onDragLeave={() => {
                            if (columnDragOverId === col.id) {
                              setColumnDragOverId(null);
                            }
                          }}
                          onDrop={(e) => {
                            if (e.dataTransfer.getData("text/kanban-column")) {
                              handleColumnDrop(e, col.id);
                            } else {
                              handleDropOnColumn(e, col.id);
                            }
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 4,
                            }}
                            draggable={isAdmin && canEdit && buildMode}
                            onDragStart={(e) =>
                              handleColumnDragStart(e, col.id)
                            }
                          >
                            <h2
                              style={{
                                fontSize: 16,
                                margin: 0,
                                cursor:
                                  isAdmin && canEdit && buildMode
                                    ? "pointer"
                                    : "default",
                                opacity:
                                  isAdmin && canEdit && buildMode ? 1 : 0.9,
                              }}
                              title={
                                isAdmin && canEdit && buildMode
                                  ? "Spalte bearbeiten"
                                  : undefined
                              }
                              onClick={() =>
                                isAdmin &&
                                canEdit &&
                                buildMode &&
                                openEditColumn(col)
                              }
                            >
                              {col.title}
                            </h2>

                            {canEdit && (
                              <button
                                style={iconButtonStyle}
                                title="Neue Karte"
                                onClick={() => openNewCardModal(col.id)}
                              >
                                ➕
                              </button>
                            )}
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                            }}
                          >
                            {cards
                              .filter((card) => card.column_id === col.id)
                              .map((card) => {
                                const assignee = users.find(
                                  (u) => u.id === card.assignee_id
                                );
                                return (
                                  <div
                                    key={card.id}
                                    style={{
                                      padding: 8,
                                      background: "#202020",
                                      border: "1px solid #333",
                                      borderRadius: 8,
                                      cursor:
                                        canEdit && !buildMode
                                          ? "grab"
                                          : "default",
                                    }}
                                    draggable={canEdit && !buildMode}
                                    onDragStart={(e) => {
                                      if (!canEdit || buildMode) return;
                                      e.dataTransfer.effectAllowed = "move";
                                      e.dataTransfer.setData(
                                        "text/kanban-card",
                                        card.id.toString()
                                      );
                                    }}
                                    onClick={() =>
                                      canEdit && openEditCard(card)
                                    }
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 4,
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 6,
                                        }}
                                      >
                                        <span
                                          style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: 999,
                                            background:
                                              card.color || "#6b7280",
                                          }}
                                        />
                                        <strong>{card.title}</strong>
                                      </div>
                                    </div>

                                    {/* Link-Anzeige */}
                                    {card.link && (
                                      <div
                                        style={{
                                          marginTop: 4,
                                          fontSize: 12,
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 6,
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <a
                                          href={card.link}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{
                                            color: "#60a5fa",
                                            textDecoration: "underline",
                                            maxWidth: "70%",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                          }}
                                          title={card.link}
                                        >
                                          Papierkram
                                        </a>
                                      </div>
                                    )}

                                    {card.description && (
                                      <p
                                        style={{
                                          margin: "2px 0 0 0",
                                          fontSize: 13,
                                          color: "#ddd",
                                        }}
                                      >
                                        {card.description}
                                      </p>
                                    )}

                                    {(card.created_at || card.due_date) && (
                                      <div
                                        style={{
                                          marginTop: 4,
                                          fontSize: 11,
                                          opacity: 0.7,
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: 2,
                                        }}
                                      >
                                        {card.created_at && (
                                          <span>
                                            Erstellt am:{" "}
                                            {card.created_at.substring(0, 10)}
                                          </span>
                                        )}
                                        {card.due_date && (
                                          <span>
                                            Fällig am:{" "}
                                            {card.due_date.substring(0, 10)}
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {assignee && (
                                      <p
                                        style={{
                                          margin: "4px 0 0 0",
                                          fontSize: 11,
                                          opacity: 0.8,
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 4,
                                        }}
                                      >
                                        👤 {assignee.name}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </>
        )}

        {viewMode === "admin" && isAdmin && (
          <AdminPanel
            users={users}
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            onResetPassword={handleAdminResetPassword}
          />
        )}

        {/* Board-Modal (neu) */}
        {showBoardModal && (
          <Modal title="Neues Board" onClose={() => setShowBoardModal(false)}>
            <input
              placeholder="Board-Name"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />
            <label style={{ display: "block", marginTop: 8, fontSize: 14 }}>
              Board-Farbe:
            </label>
            <select
              value={newBoardColor}
              onChange={(e) => setNewBoardColor(e.target.value)}
              style={{ width: "100%", padding: 6, marginTop: 4 }}
            >
              <option value="#111827">Dunkelblau</option>
              <option value="#1f2937">Grau</option>
              <option value="#4b5563">Slate</option>
              <option value="#312e81">Indigo</option>
              <option value="#14532d">Grün</option>
              <option value="#7f1d1d">Rot</option>
            </select>
            <button
              onClick={createBoard}
              style={{ ...primaryButtonStyle, marginTop: 10 }}
            >
              Erstellen
            </button>
          </Modal>
        )}

        {/* Board bearbeiten */}
        {editingBoard && (
          <Modal
            title="Board bearbeiten"
            onClose={() => setEditingBoard(null)}
          >
            <input
              value={editBoardName}
              onChange={(e) => setEditBoardName(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />

            <label style={{ display: "block", marginTop: 8, fontSize: 14 }}>
              Board-Farbe:
            </label>
            <select
              value={editBoardColor}
              onChange={(e) => setEditBoardColor(e.target.value)}
              style={{ width: "100%", padding: 6, marginTop: 4 }}
            >
              <option value="#111827">Dunkelblau</option>
              <option value="#1f2937">Grau</option>
              <option value="#4b5563">Slate</option>
              <option value="#312e81">Indigo</option>
              <option value="#14532d">Grün</option>
              <option value="#7f1d1d">Rot</option>
            </select>

            <button
              onClick={saveBoardChanges}
              style={{ ...primaryButtonStyle, marginTop: 10 }}
            >
              Speichern
            </button>
          </Modal>
        )}

        {/* Neue Spalte */}
        {showColumnModal && (
          <Modal
            title="Neue Spalte"
            onClose={() => setShowColumnModal(false)}
          >
            <input
              placeholder="Spaltenname"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />
            <label style={{ display: "block", marginTop: 8, fontSize: 14 }}>
              Spaltenfarbe:
            </label>
            <select
              value={newColumnColor}
              onChange={(e) => setNewColumnColor(e.target.value)}
              style={{ width: "100%", padding: 6, marginTop: 4 }}
            >
              <option value="#181818">Dunkel (Standard)</option>
              <option value="#1f2933">Blau-Grau</option>
              <option value="#312e81">Indigo</option>
              <option value="#4b5563">Grau</option>
              <option value="#14532d">Grün</option>
              <option value="#7f1d1d">Rot</option>
              <option value="#78350f">Orange</option>
            </select>
            <button
              onClick={createColumn}
              style={{ ...primaryButtonStyle, marginTop: 10 }}
            >
              Erstellen
            </button>
          </Modal>
        )}

        {/* Karte: neu / bearbeiten */}
        {(showCardModal || editingCard) && (
          <Modal
            title={editingCard ? "Karte bearbeiten" : "Neue Karte"}
            onClose={() => {
              setShowCardModal(false);
              setEditingCard(null);
              setCardHistory([]);
            }}
          >
            <input
              placeholder="Titel"
              value={cardTitle}
              onChange={(e) => setCardTitle(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />

            {editingCard && editingCard.created_at && (
              <p
                style={{
                  marginTop: 6,
                  marginBottom: 0,
                  fontSize: 12,
                  opacity: 0.7,
                }}
              >
                Erstellt am: {editingCard.created_at.substring(0, 10)}
              </p>
            )}

            <textarea
              placeholder="Beschreibung"
              value={cardDescription}
              onChange={(e) => setCardDescription(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 8 }}
            />
            <label style={{ display: "block", marginTop: 8, fontSize: 14 }}>
              Fällig am:
            </label>
            <input
              type="date"
              value={cardDueDate}
              onChange={(e) => setCardDueDate(e.target.value)}
              style={{ padding: 6, marginTop: 4 }}
            />

            <label style={{ display: "block", marginTop: 8, fontSize: 14 }}>
              Priorität:
            </label>
            <select
              value={cardColor}
              onChange={(e) => setCardColor(e.target.value)}
              style={{ width: "100%", padding: 6, marginTop: 4 }}
            >
              <option value="#6b7280">Keine / Normal</option>
              <option value="#16a34a">Niedrig (Grün)</option>
              <option value="#eab308">Mittel (Gelb)</option>
              <option value="#dc2626">Hoch (Rot)</option>
            </select>

            <label style={{ display: "block", marginTop: 8, fontSize: 14 }}>
              Zugewiesen an:
            </label>
            <select
              value={cardAssigneeId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setCardAssigneeId(v === "" ? null : Number(v));
              }}
              style={{ width: "100%", padding: 6, marginTop: 4 }}
            >
              <option value="">(Niemand)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            <label style={{ display: "block", marginTop: 8, fontSize: 14 }}>
              Link:
            </label>
            <input
              type="url"
              placeholder="https://…"
              value={cardLink}
              onChange={(e) => setCardLink(e.target.value)}
              style={{ width: "100%", padding: 6, marginTop: 4 }}
            />

            {/* History-Ansicht */}
            {editingCard && (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 8,
                  borderTop: "1px solid #1f2937",
                  maxHeight: 150,
                  overflowY: "auto",
                  fontSize: 11,
                  opacity: 0.85,
                }}
              >
                <div style={{ marginBottom: 4, fontWeight: 600 }}>Verlauf</div>
                {cardHistory.length === 0 && (
                  <div style={{ opacity: 0.7 }}>Keine Änderungen erfasst.</div>
                )}
                {cardHistory.map((entry) => {
                  const user = users.find((u) => u.id === entry.user_id);
                  const who = user ? user.name : "Unbekannt";
                  const ts = entry.created_at
                    ?.substring(0, 19)
                    ?.replace("T", " ");

                  // Hilfsfunktionen für hübsche Texte
                  const formatDate = (value) => {
                    if (!value) return "—";
                    try {
                      return value.substring(0, 10);
                    } catch {
                      return value;
                    }
                  };

                  const fieldLabel = (field) => {
                    switch (field) {
                      case "title":
                        return "den Titel";
                      case "description":
                        return "die Beschreibung";
                      case "due_date":
                        return "das Fälligkeitsdatum";
                      case "column_id":
                        return "die Spalte";
                      case "color":
                        return "die Priorität";
                      case "assignee_id":
                        return "die Zuständigkeit";
                      case "link":
                        return "den Link";
                      default:
                        return `das Feld „${field}”`;
                    }
                  };

                  // Spezialfall: Karte erstellt / gelöscht (ohne Feld)
                  if (entry.action === "create") {
                    return (
                      <div key={entry.id} style={{ marginBottom: 4 }}>
                        <div>
                          <strong>{who}</strong> – Karte erstellt
                        </div>
                        {ts && <div style={{ opacity: 0.6 }}>{ts}</div>}
                      </div>
                    );
                  }

                  if (entry.action === "delete") {
                    return (
                      <div key={entry.id} style={{ marginBottom: 4 }}>
                        <div>
                          <strong>{who}</strong> – Karte gelöscht
                        </div>
                        {ts && <div style={{ opacity: 0.6 }}>{ts}</div>}
                      </div>
                    );
                  }

                  // Spezialfall: Spalte (column_id) → von Spalte A nach Spalte B
                  if (entry.field === "column_id") {
                    const oldCol = columns.find(
                      (c) => String(c.id) === String(entry.old_value)
                    );
                    const newCol = columns.find(
                      (c) => String(c.id) === String(entry.new_value)
                    );

                    const oldName = oldCol ? oldCol.title : entry.old_value;
                    const newName = newCol ? newCol.title : entry.new_value;

                    return (
                      <div key={entry.id} style={{ marginBottom: 4 }}>
                        <div>
                          <strong>{who}</strong> – hat die Karte von{" "}
                          <strong>{oldName ?? "Unbekannt"}</strong> nach{" "}
                          <strong>{newName ?? "Unbekannt"}</strong> verschoben
                        </div>
                        {ts && <div style={{ opacity: 0.6 }}>{ts}</div>}
                      </div>
                    );
                  }

                  // Spezialfall: Zuständigkeit (assignee_id)
                  if (entry.field === "assignee_id") {
                    const oldUser = users.find(
                      (u) => String(u.id) === String(entry.old_value)
                    );
                    const newUser = users.find(
                      (u) => String(u.id) === String(entry.new_value)
                    );

                    const oldName = oldUser
                      ? oldUser.name
                      : entry.old_value || "niemand";
                    const newName = newUser
                      ? newUser.name
                      : entry.new_value || "niemand";

                    return (
                      <div key={entry.id} style={{ marginBottom: 4 }}>
                        <div>
                          <strong>{who}</strong> – hat die Zuständigkeit von{" "}
                          <strong>{oldName}</strong> zu{" "}
                          <strong>{newName}</strong> geändert
                        </div>
                        {ts && <div style={{ opacity: 0.6 }}>{ts}</div>}
                      </div>
                    );
                  }

                  // Spezialfall: Fälligkeitsdatum
                  if (entry.field === "due_date") {
                    return (
                      <div key={entry.id} style={{ marginBottom: 4 }}>
                        <div>
                          <strong>{who}</strong> – hat das Fälligkeitsdatum
                          geändert
                        </div>
                        <div style={{ opacity: 0.8 }}>
                          Alt: <span>{formatDate(entry.old_value)}</span>
                          {" · "}Neu: <span>{formatDate(entry.new_value)}</span>
                        </div>
                        {ts && <div style={{ opacity: 0.6 }}>{ts}</div>}
                      </div>
                    );
                  }

                  // Farbname aus Hex erzeugen
                  const colorName = (hex) => {
                    if (!hex) return "Keine";
                    const map = {
                      "#dc2626": "Hoch",
                      "#eab308": "Mittel",
                      "#16a34a": "Niedrig",
                      "#6b7280": "Keine",
                    };
                    return map[hex.toLowerCase()] || hex;
                  };

                  // Spezialfall: Priorität (color)
                  if (entry.field === "color") {
                    return (
                      <div key={entry.id} style={{ marginBottom: 4 }}>
                        <div>
                          <strong>{who}</strong> – hat die Priorität geändert
                        </div>
                        <div style={{ opacity: 0.8 }}>
                          Alt: <span>{colorName(entry.old_value)}</span>
                          {" · "}
                          Neu: <span>{colorName(entry.new_value)}</span>
                        </div>
                        {ts && <div style={{ opacity: 0.6 }}>{ts}</div>}
                      </div>
                    );
                  }

                  // Titel, Beschreibung, Link & alle übrigen Felder
                  if (entry.action === "update") {
                    return (
                      <div key={entry.id} style={{ marginBottom: 4 }}>
                        <div>
                          <strong>{who}</strong> – hat{" "}
                          {fieldLabel(entry.field)} geändert
                        </div>
                        {entry.old_value !== entry.new_value && (
                          <div style={{ opacity: 0.8 }}>
                            Alt: <span>{entry.old_value ?? "—"}</span>
                            {" · "}Neu: <span>{entry.new_value ?? "—"}</span>
                          </div>
                        )}
                        {ts && <div style={{ opacity: 0.6 }}>{ts}</div>}
                      </div>
                    );
                  }

                  // Fallback: falls mal ein anderer action-Typ auftaucht
                  return (
                    <div key={entry.id} style={{ marginBottom: 4 }}>
                      <div>
                        <strong>{who}</strong> – {entry.action} ({entry.field})
                      </div>
                      {ts && <div style={{ opacity: 0.6 }}>{ts}</div>}
                    </div>
                  );
                })}
              </div>
            )}

            <div
              style={{
                marginTop: 10,
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <button
                onClick={editingCard ? saveCardChanges : createCard}
                style={{ ...primaryButtonStyle }}
              >
                {editingCard ? "Speichern" : "Erstellen"}
              </button>

              {editingCard && canDelete && (
                <button
                  onClick={async () => {
                    await deleteCard(editingCard.id);
                    setEditingCard(null);
                    setShowCardModal(false);
                    setCardHistory([]);
                  }}
                  style={{
                    ...primaryButtonStyle,
                    borderColor: "#a33",
                    background: "#331111",
                  }}
                >
                  Karte löschen
                </button>
              )}
            </div>
          </Modal>
        )}

        {/* Spalte bearbeiten + Löschen im Modal */}
        {editingColumn && (
          <Modal
            title="Spalte bearbeiten"
            onClose={() => setEditingColumn(null)}
          >
            <input
              value={editColumnTitle}
              onChange={(e) => setEditColumnTitle(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />

            <label style={{ display: "block", marginTop: 8, fontSize: 14 }}>
              Spaltenfarbe:
            </label>
            <select
              value={editColumnColor}
              onChange={(e) => setEditColumnColor(e.target.value)}
              style={{ width: "100%", padding: 6, marginTop: 4 }}
            >
              <option value="#181818">Dunkel (Standard)</option>
              <option value="#1f2933">Blau-Grau</option>
              <option value="#312e81">Indigo</option>
              <option value="#4b5563">Grau</option>
              <option value="#14532d">Grün</option>
              <option value="#7f1d1d">Rot</option>
              <option value="#78350f">Orange</option>
            </select>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <button
                onClick={saveColumnChanges}
                style={{ ...primaryButtonStyle }}
                disabled={!buildMode || !canEdit || !isAdmin}
              >
                Speichern
              </button>
              {buildMode && canDelete && isAdmin && (
                <button
                  onClick={deleteColumnFromModal}
                  style={{
                    ...primaryButtonStyle,
                    borderColor: "#a33",
                    background: "#331111",
                  }}
                >
                  Spalte löschen
                </button>
              )}
            </div>
          </Modal>
        )}

        {/* Login-Modal */}
        {showLoginModal && (
          <Modal title="Login" onClose={() => setShowLoginModal(false)}>
            <input
              placeholder="Name"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />
            <input
              type="password"
              placeholder="Passwort"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 8 }}
            />
            {authError && (
              <p
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "#f87171",
                }}
              >
                {authError}
              </p>
            )}
            <button
              onClick={handleLogin}
              style={{ ...primaryButtonStyle, marginTop: 10 }}
            >
              Login
            </button>
          </Modal>
        )}

        {/* Registrieren-Modal */}
        {showRegisterModal && (
          <Modal
            title="Registrieren"
            onClose={() => setShowRegisterModal(false)}
          >
            <input
              placeholder="Name"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />
            <input
              placeholder="E-Mail (optional)"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 8 }}
            />
            <input
              type="password"
              placeholder="Passwort"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 8 }}
            />
            {authError && (
              <p
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "#f87171",
                }}
              >
                {authError}
              </p>
            )}
            <button
              onClick={handleRegister}
              style={{ ...primaryButtonStyle, marginTop: 10 }}
            >
              Registrieren
            </button>
          </Modal>
        )}

        {/* Pflicht-Passwortwechsel-Modal */}
        {showPwChangeModal && currentUser && (
          <Modal
            title="Neues Passwort setzen"
            onClose={() => {
              // Wenn du es wirklich erzwingen willst, lass onClose leer:
              // onClose={() => {}}
              setShowPwChangeModal(false);
            }}
          >
            <p
              style={{
                fontSize: 13,
                opacity: 0.8,
                marginTop: 0,
                marginBottom: 8,
              }}
            >
              Bitte lege ein neues persönliches Passwort fest. Dieses Fenster
              kann vom Admin erzwungen worden sein.
            </p>

            <input
              type="password"
              placeholder="Neues Passwort"
              value={pwChangeNew}
              onChange={(e) => setPwChangeNew(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />
            <input
              type="password"
              placeholder="Neues Passwort (Wiederholung)"
              value={pwChangeNew2}
              onChange={(e) => setPwChangeNew2(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 8 }}
            />

            {pwChangeError && (
              <p
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "#f87171",
                }}
              >
                {pwChangeError}
              </p>
            )}

            <button
              onClick={handleChangePassword}
              style={{ ...primaryButtonStyle, marginTop: 10 }}
            >
              Passwort speichern
            </button>
          </Modal>
        )}
      </div>
    </div>
  );
}

export default App;
