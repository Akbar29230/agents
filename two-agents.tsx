import React, { useState, useRef, useEffect } from "react";
import { Send, Target, PenLine, Loader2, Sparkles, ListChecks } from "lucide-react";

const MODEL = "claude-sonnet-4-6";

async function callClaude(systemPrompt, userText) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userText }],
    }),
  });
  const data = await res.json();
  const text = (data.content || [])
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n")
    .trim();
  return text || "Не удалось получить ответ. Попробуй ещё раз.";
}

function countWords(str) {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

// ---------- Productivity Agent ----------
function ProductivityAgent() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Привет! Я слежу за твоей продуктивностью — целями, привычками, задачами, фокус-сессиями. С чего начнём: план на сегодня, разбивка цели на шаги или просто мотивация?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const SYSTEM = `Ты — агент-коуч по продуктивности для пользователя, который ведёт систему в стиле Ledger Goal Planner: цели, привычки, задачи, Pomodoro-сессии, XP-система. Отвечай на русском, кратко и по делу, без воды. Давай конкретные, выполнимые шаги. Если просят план дня — предлагай структуру с Pomodoro-блоками (25/5 минут). Если просят разбить цель — дай 3-6 конкретных подзадач. Тон — поддерживающий, но не приторный, как хороший тренер.`;

  const send = async (text) => {
    const t = text ?? input;
    if (!t.trim() || loading) return;
    const next = [...messages, { role: "user", text: t }];
    setMessages(next);
    setInput("");
    setLoading(true);
    const history = next.map((m) => `${m.role === "user" ? "Пользователь" : "Агент"}: ${m.text}`).join("\n\n");
    const reply = await callClaude(SYSTEM, history);
    setMessages((m) => [...m, { role: "assistant", text: reply }]);
    setLoading(false);
  };

  const quickActions = [
    { label: "План на день", icon: ListChecks, prompt: "Составь мне структурированный план на сегодня с Pomodoro-блоками." },
    { label: "Разбить цель", icon: Target, prompt: "Помоги разбить крупную цель на конкретные подзадачи." },
    { label: "Мотивация", icon: Sparkles, prompt: "Мне нужна короткая, честная мотивационная поддержка сейчас." },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 px-4 pt-4 flex-wrap">
        {quickActions.map((qa) => (
          <button
            key={qa.label}
            onClick={() => send(qa.prompt)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-teal-700/40 text-teal-200 hover:bg-teal-800/30 transition-colors"
          >
            <qa.icon size={13} /> {qa.label}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-teal-700/90 text-white rounded-br-sm"
                  : "bg-[#132420] text-teal-50 border border-teal-800/50 rounded-bl-sm"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#132420] border border-teal-800/50 rounded-2xl rounded-bl-sm px-4 py-2.5 text-teal-300">
              <Loader2 size={16} className="animate-spin" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-teal-900/50 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Спроси про задачи, привычки, фокус..."
          className="flex-1 bg-[#0F1E1A] border border-teal-800/50 rounded-xl px-4 py-2.5 text-sm text-teal-50 placeholder-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-600"
        />
        <button
          onClick={() => send()}
          disabled={loading}
          className="bg-teal-700 hover:bg-teal-600 disabled:opacity-40 rounded-xl px-4 py-2.5 text-white transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ---------- Essay Agent ----------
function EssayAgent() {
  const [topic, setTopic] = useState("");
  const [ideas, setIdeas] = useState("");
  const [band, setBand] = useState("6.5");
  const [essay, setEssay] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setEssay("");

    const systemBand65 = `Ты — агент, пишущий эссе IELTS Writing Task 2 строго по фиксированной схеме пользователя: структура ровно 25/100/100/25 слов (вступление/аргумент 1/аргумент 2/заключение), уровень словаря B2 (без C1-лексики), стандартные связки (however, moreover, in addition, therefore, in conclusion и т.п.), целевой балл Band 6.5. Пиши только текст эссе на английском, без заголовков и пояснений от себя.`;

    const systemBand78 = `Ты — агент, пишущий эссе IELTS Writing Task 2 на Band 7.5-8: точное количество слов (обычно 260-290), лексика уровня C1, причинно-следственные связки (Due to / Thanks to / Owing to), более сложные структуры предложений. Пиши только текст эссе на английском, без заголовков и пояснений от себя.`;

    const system = band === "6.5" ? systemBand65 : systemBand78;
    const userMsg = `Тема эссе: ${topic}${ideas.trim() ? `\n\nИспользуй именно эти мои идеи и аргументы, не заменяй их своими: ${ideas}` : ""}`;

    const result = await callClaude(system, userMsg);
    setEssay(result);
    setLoading(false);
  };

  const paragraphs = essay ? essay.split(/\n\s*\n/).filter(Boolean) : [];
  const totalWords = essay ? countWords(essay) : 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 space-y-3">
        <div>
          <label className="text-xs text-amber-300/80 uppercase tracking-wide">Тема эссе</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Например: success, happiness, crime and punishment..."
            className="w-full mt-1 bg-[#1F150C] border border-amber-800/50 rounded-xl px-4 py-2.5 text-sm text-amber-50 placeholder-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
        </div>

        <div>
          <label className="text-xs text-amber-300/80 uppercase tracking-wide">Твои идеи (опционально, сохраню как есть)</label>
          <textarea
            value={ideas}
            onChange={(e) => setIdeas(e.target.value)}
            placeholder="Если есть свои аргументы — впиши их, я их не заменю"
            rows={3}
            className="w-full mt-1 bg-[#1F150C] border border-amber-800/50 rounded-xl px-4 py-2.5 text-sm text-amber-50 placeholder-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-600 resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-amber-300/80 uppercase tracking-wide">Уровень</span>
          <div className="flex rounded-full border border-amber-800/50 overflow-hidden text-xs">
            <button
              onClick={() => setBand("6.5")}
              className={`px-3 py-1.5 transition-colors ${band === "6.5" ? "bg-amber-700 text-white" : "text-amber-300"}`}
            >
              Band 6.5
            </button>
            <button
              onClick={() => setBand("7.5-8")}
              className={`px-3 py-1.5 transition-colors ${band === "7.5-8" ? "bg-amber-700 text-white" : "text-amber-300"}`}
            >
              Band 7.5-8
            </button>
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading || !topic.trim()}
          className="w-full flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 rounded-xl px-4 py-2.5 text-sm text-white transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <PenLine size={16} />}
          {loading ? "Пишу эссе..." : "Сгенерировать эссе"}
        </button>
      </div>

      {essay && (
        <div className="mx-4 mb-4 bg-[#1F150C] border border-amber-800/50 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center text-xs text-amber-400">
            <span>Готовое эссе</span>
            <span>{totalWords} слов</span>
          </div>
          {paragraphs.map((p, i) => (
            <p key={i} className="text-sm text-amber-50 leading-relaxed whitespace-pre-wrap">
              {p}
              <span className="text-amber-600 text-xs ml-2">({countWords(p)} сл.)</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Main App ----------
export default function TwoAgents() {
  const [active, setActive] = useState("productivity");

  return (
    <div className="w-full h-screen bg-[#0B0D12] flex flex-col font-sans">
      <div className="px-6 pt-6 pb-3">
        <h1 className="text-2xl font-semibold text-stone-100 tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
          Мои агенты
        </h1>
        <p className="text-sm text-stone-500 mt-0.5">Два помощника, две задачи — переключайся между ними</p>
      </div>

      <div className="px-6 flex gap-3">
        <button
          onClick={() => setActive("productivity")}
          className={`flex-1 flex items-center gap-2 justify-center rounded-t-xl px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
            active === "productivity"
              ? "bg-[#0F1E1A] text-teal-200 border-teal-500"
              : "bg-transparent text-stone-500 border-transparent hover:text-stone-300"
          }`}
        >
          <Target size={15} /> Продуктивность
        </button>
        <button
          onClick={() => setActive("essay")}
          className={`flex-1 flex items-center gap-2 justify-center rounded-t-xl px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
            active === "essay"
              ? "bg-[#1F150C] text-amber-200 border-amber-500"
              : "bg-transparent text-stone-500 border-transparent hover:text-stone-300"
          }`}
        >
          <PenLine size={15} /> IELTS Эссе
        </button>
      </div>

      <div className={`flex-1 overflow-hidden ${active === "productivity" ? "bg-[#0F1E1A]" : "bg-[#1F150C]"}`}>
        {active === "productivity" ? <ProductivityAgent /> : <EssayAgent />}
      </div>
    </div>
  );
}
