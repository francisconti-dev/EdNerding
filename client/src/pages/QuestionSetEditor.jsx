import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

const EMPTY_FORM = { text: "", choices: ["", "", "", ""], answer: 0 };

export default function QuestionSetEditor() {
  const { key } = useParams();
  const navigate = useNavigate();

  const [set, setSet] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null); // null = adding new

  const load = () => {
    api.getSet(key).then(setSet).catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, [key]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleChoiceChange = (i, value) => {
    const choices = [...form.choices];
    choices[i] = value;
    setForm({ ...form, choices });
  };

  const handleAddChoice = () => {
    if (form.choices.length >= 6) return;
    setForm({ ...form, choices: [...form.choices, ""] });
  };

  const handleRemoveChoice = (i) => {
    if (form.choices.length <= 2) return;
    const choices = form.choices.filter((_, idx) => idx !== i);
    let answer = form.answer;
    if (answer === i) answer = 0;
    else if (answer > i) answer -= 1;
    setForm({ ...form, choices, answer });
  };

  const validate = () => {
    if (!form.text.trim()) return "Question text is required.";
    const filled = form.choices.filter((c) => c.trim() !== "");
    if (filled.length < 2) return "At least 2 answer choices are required.";
    if (form.choices[form.answer] === undefined || form.choices[form.answer].trim() === "") {
      return "Please select a valid correct answer.";
    }
    return null;
  };

  const handleSubmit = async () => {
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const choices = form.choices.filter((c) => c.trim() !== "");
    const payload = { text: form.text.trim(), choices, answer: form.answer };

    try {
      if (editingId) {
        await api.updateQuestion(key, editingId, payload);
      } else {
        await api.addQuestion(key, payload);
      }
      resetForm();
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleEdit = (q) => {
    setForm({
      text: q.text,
      choices: [...q.choices],
      answer: q.answer
    });
    setEditingId(q.id);
  };

  const handleDelete = async (questionId) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await api.deleteQuestion(key, questionId);
      if (editingId === questionId) resetForm();
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!set) {
    return (
      <div className="container">
        <div className="card">
          {error ? <p style={{ color: "#dc2626" }}>{error}</p> : <p>Loading...</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h1>{set.name}</h1>
        <p>{set.questions.length} question(s)</p>
        {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      </div>

      <div className="card">
        <h3>{editingId ? "Edit Question" : "Add New Question"}</h3>
        <input
          placeholder="Question text"
          value={form.text}
          onChange={(e) => setForm({ ...form, text: e.target.value })}
        />

        <p style={{ marginBottom: 4, color: "#6b7280" }}>
          Answer choices (select the radio button next to the correct one):
        </p>
        {form.choices.map((choice, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input
              type="radio"
              name="correctAnswer"
              checked={form.answer === i}
              onChange={() => setForm({ ...form, answer: i })}
              style={{ width: "auto", margin: 0 }}
            />
            <input
              placeholder={`Choice ${i + 1}`}
              value={choice}
              onChange={(e) => handleChoiceChange(i, e.target.value)}
              style={{ margin: 0, flex: 1 }}
            />
            {form.choices.length > 2 && (
              <button
                onClick={() => handleRemoveChoice(i)}
                style={{ background: "#dc2626", padding: "10px 14px" }}
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {form.choices.length < 6 && (
            <button onClick={handleAddChoice} style={{ background: "#6b7280" }}>
              + Add Choice
            </button>
          )}
          <button onClick={handleSubmit}>{editingId ? "Save Changes" : "Add Question"}</button>
          {editingId && (
            <button onClick={resetForm} style={{ background: "#6b7280" }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Questions</h3>
        {set.questions.length === 0 && <p>No questions yet. Add one above.</p>}
        {set.questions.map((q, i) => (
          <div key={q.id} className="upgrade-card">
            <div>
              <strong>
                {i + 1}. {q.text}
              </strong>
              <p style={{ margin: "4px 0", color: "#6b7280" }}>
                {q.choices.map((c, idx) => (
                  <span key={idx} style={{ marginRight: 12 }}>
                    {idx === q.answer ? "✅ " : ""}
                    {c}
                  </span>
                ))}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleEdit(q)}>Edit</button>
              <button onClick={() => handleDelete(q.id)} style={{ background: "#dc2626" }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => navigate("/question-sets")} style={{ background: "#6b7280" }}>
        Back to Question Sets
      </button>
    </div>
  );
}
