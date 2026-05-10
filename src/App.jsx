import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"
import "./App.css"
import {
  Routes,
  Route,
  useParams,
  useNavigate
} from "react-router-dom"


function PollList({ polls, onSelect, onHome }) {
  return (
    <div className="poll-list">

      <button
        className="poll-btn home-btn"
        onClick={onHome}
      >
        🏠 首頁
      </button>

      {polls.map(p => (
        <button
          className="poll-btn home-btn"
          key={p.id}
          onClick={() => onSelect(p.id)}
        >
          {p.title}
        </button>
      ))}

    </div>
  )
}

function HomePage() {


}
function LoginPage() {

}

function PollPage() {
  const [options, setOptions] = useState([])

  const [poll, setPoll] = useState([])
  const { pollId } = useParams()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)

  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [loadingId, setLoadingId] = useState(null)
  const [editOption, setEditOption] = useState(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")

  const [user, setUser] = useState(null)
  // =========================
  // Functions
  // =========================

  useEffect(() => {
    const initUser = async () => {

      let userId = localStorage.getItem("user_id")
      console.log(userId)


      // =========================
      // 1. localStorage 有 userId
      // =========================
      if (userId) {

        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .maybeSingle()


        // DB 找不到 → 重建
        if (!data) {
          const { data: newUser } = await supabase
            .from("users")
            .insert([
              { nickname: "guest_" + Math.floor(Math.random() * 10000) }
            ])
            .select()
            .single()

          userId = newUser.id
          localStorage.setItem("user_id", userId)
          setUser(newUser)

        } else {
          setUser(data)
        }


      }

      // =========================
      // 2. localStorage 沒 userId
      // =========================
      else {

        const { data: newUser } = await supabase
          .from("users")
          .insert([
            { nickname: "guest_" + Math.floor(Math.random() * 10000) }
          ])
          .select()
          .single()

        userId = newUser.id
        localStorage.setItem("user_id", userId)
        setUser(newUser)
      }
    }

    initUser()
  }, [])


  useEffect(() => {
    if (pollId) {
      fetchOptions()
    }
  }, [pollId])

  useEffect(() => {
    fetchPoll()
  }, [pollId])






  const fetchOptions = async () => {

    const { data: optionsData } = await supabase
      .from("options")
      .select("*")
      .eq("poll_id", pollId)

    const { data: votesData } = await supabase
      .from("votes")
      .select("*")

    const countMap = {}

    votesData.forEach(v => {
      countMap[v.option_id] = (countMap[v.option_id] || 0) + 1
    })

    const merged = optionsData.map(o => ({
      ...o,
      voteCount: countMap[o.id] || 0
    }))

    setOptions(merged)
  }

  const fetchPoll = async () => {

    const { data } = await supabase
      .from("polls")
      .select("*")
      .eq("id", pollId)
      .single()


    setPoll(data)
  }

  const addOption = async () => {
    let image_url = ""

    // ======================
    // 上傳圖片（如果有）
    // ======================
    if (file) {
      const fileName = `${Date.now()}-${file.name}`

      const { error } = await supabase.storage
        .from("option-images")
        .upload(fileName, file)

      if (error) {
        console.log(error)
        return
      }

      const { data } = supabase.storage
        .from("option-images")
        .getPublicUrl(fileName)

      image_url = data.publicUrl
    }

    // ======================
    // 存 option
    // ======================
    await supabase.from("options").insert([
      {
        poll_id: pollId,
        title,
        description,
        image_url,
        user_id: user.id
      }
    ])

    // ======================
    // 清空表單
    // ======================
    setTitle("")
    setDescription("")
    setFile(null)
    setShowForm(false)
    fetchOptions()
  }

  const vote = async (optionId) => {
    setLoadingId(optionId)

    const { data: existing } = await supabase
      .from("votes")
      .select("*")
      .eq("option_id", optionId)
      .maybeSingle()

    if (existing) {
      await supabase.from("votes").delete().eq("id", existing.id)
    } else {
      await supabase.from("votes").insert([{ option_id: optionId }])
    }

    await fetchOptions()
    setLoadingId(null)
  }

  // =========================
  // JSX
  // =========================
  return (


    <div className="outercontainer">
      <h1>{poll?.title}</h1>

      <button className="poll-btn home-btn" onClick={() => setShowForm(true)}>
        + 新增 OPTION
      </button>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">

            <h2>新增 Option</h2>

            <input
              placeholder="標題"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <input
              placeholder="描述"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0]
                setFile(file)

                if (file) {
                  setPreview(URL.createObjectURL(file))
                } else {
                  setPreview(null)
                }
              }}
            />

            {preview && (
              <div style={{ marginTop: 10 }}>
                <img src={preview} width="150" />
              </div>
            )}

            <div className="modal-actions">
              <button onClick={addOption}>
                新增 OPTION
              </button>

              <button onClick={() => setShowForm(false)}>
                取消
              </button>
            </div>

          </div>
        </div>
      )}

      {options.map(o => (
        <div key={o.id} className="card">
          {/* 圖片 */}
          {o.image_url && (
            <img src={o.image_url} className="card-img" />
          )}

          {/* 內容 */}
          <div className="card-body">
            <h3>
              {o.title} ❤️ {o.voteCount} 票
            </h3>

            <p>{o.description}</p>

            <button
              className="vote-btn"
              onClick={() => vote(o.id)}
              disabled={loadingId === o.id}
            >
              {loadingId === o.id ? "處理中..." : "投這個"}
            </button>
            {(o.user_id === user.id || user?.authority === 1) && (
              <button
                onClick={() => {
                  setEditOption(o)
                  setEditTitle(o.title)
                  setEditDescription(o.description)
                }}
              >
                ✏️ 修改
              </button>
            )}
            {(o.user_id === user.id || user?.authority === 1) && (
  <button
    onClick={async () => {
      await supabase
        .from("options")
        .delete()
        .eq("id", o.id)

      fetchOptions()
    }}
  >
    🗑 刪除
  </button>
)}
          </div>
        </div>
      ))}
      {editOption && (
        <div className="modal-overlay">
          <div className="modal">

            <h2>修改 Option</h2>

            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />

            <input
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />

            <div className="modal-actions">

              <button
                onClick={async () => {
                  await supabase
                    .from("options")
                    .update({
                      title: editTitle,
                      description: editDescription
                    })
                    .eq("id", editOption.id)

                  setEditOption(null)
                  fetchOptions()
                }}
              >
                儲存
              </button>
              

              <button onClick={() => setEditOption(null)}>
                取消
              </button>
              

            </div>

          </div>
        </div>
      )}
    </div>
  )


}

function App() {
  const [user, setUser] = useState(null)

  const [polls, setPolls] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const initUser = async () => {

      let userId = localStorage.getItem("user_id")


      // =========================
      // 1. localStorage 有 userId
      // =========================
      if (userId) {

        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .maybeSingle()


        // DB 找不到 → 重建
        if (!data) {
          const { data: newUser } = await supabase
            .from("users")
            .insert([
              { nickname: "guest_" + Math.floor(Math.random() * 10000) }
            ])
            .select()
            .single()

          userId = newUser.id
          localStorage.setItem("user_id", userId)
          setUser(newUser)

        } else {
          setUser(data)
        }

      }

      // =========================
      // 2. localStorage 沒 userId
      // =========================
      else {

        const { data: newUser } = await supabase
          .from("users")
          .insert([
            { nickname: "guest_" + Math.floor(Math.random() * 10000) }
          ])
          .select()
          .single()

        userId = newUser.id
        localStorage.setItem("user_id", userId)
        setUser(newUser)
      }
    }

    initUser()
  }, [])


  useEffect(() => {
    fetchPolls()
  }, [])

  const fetchPolls = async () => {
    const { data } = await supabase
      .from("polls")
      .select("*")

    setPolls(data)

  }



  return (
    <div className="layout">

      <PollList
        polls={polls}
        onSelect={(id) => navigate(`/poll/${id}`)}
        onHome={() => navigate(`/`)}
      />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/poll/:pollId" element={<PollPage />} />
      </Routes>

    </div>
  )
}

export default App