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
  const [selectedOption, setSelectedOption] = useState(null)
  const MAX_DESCRIPTION = 200

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

      const fileExt = file.name.split(".").pop()

      const fileName = `${crypto.randomUUID()}.${fileExt}`

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
    const shortDescription = description.slice(0, 100)
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
  const deleteOption = async (option) => {

    // =========================
    // 確認
    // =========================
    const ok = window.confirm("確定要刪除這個 option 嗎？")

    if (!ok) return

    // =========================
    // 刪 votes
    // =========================
    await supabase
      .from("votes")
      .delete()
      .eq("option_id", option.id)

    // =========================
    // 刪圖片
    // =========================
    if (option.image_url) {

      // 從 URL 取出檔名
      const fileName = option.image_url.split("/").pop()

      await supabase.storage
        .from("option-images")
        .remove([fileName])
    }

    // =========================
    // 刪 option
    // =========================
    await supabase
      .from("options")
      .delete()
      .eq("id", option.id)

    fetchOptions()
  }

  // =========================
  // JSX
  // =========================
  return (


    <div className="outercontainer">
      <div className="background-title">
        <h1 className="poll-title">{poll?.title}</h1>
      </div>
      <div className="background-body">
      <button className="add-option-btn" onClick={() => setShowForm(true)}>+ 推薦好友 </button>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">

            <h2>候選人資料</h2>

            <input
              placeholder="姓名"
              value={title}
              maxLength={10}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="description-input"
              placeholder="100字內介紹你的候選人"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <p style={{ fontSize: "12px" }}>選一張最棒的照片(確定後不可修改)</p>

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
              <button className="save-btn" onClick={addOption}>
                確定
              </button>

              <button className="cancel-btn" onClick={() => setShowForm(false)}>
                取消
              </button>
            </div>

          </div>
        </div>
      )}

      {options.map(o => (
        <div key={o.id}
          className="card"
        >
          {/* 圖片 */}
          {o.image_url && (
            <img src={o.image_url} className="card-img" onClick={() => setSelectedOption(o)} />
          )}

          {/* 內容 */}
          <div className="card-body">
            <h3>
              {o.title} ❤️ {o.voteCount} 票
            </h3>

            <button
              className="vote-btn"
              onClick={() => vote(o.id)}
              disabled={loadingId === o.id}
            >
              {loadingId === o.id ? "投票中..." : "👍"}
            </button>
            {(o.user_id === user.id || user?.authority === 1) && (
              <button
                className="edit-btn"
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
              <button className="delete-btn" onClick={() => deleteOption(o)}>
                🗑 刪除
              </button>
            )}
          </div>
        </div>
      ))}
      {editOption && (
        <div className="modal-overlay">
          <div className="modal">

            <h2>修改</h2>

            <input
              value={editTitle}
              maxLength={10}
              onChange={(e) => setEditTitle(e.target.value)}
            />

            <textarea
              className="description-input"
              placeholder="100字內介紹你的候選人"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />

            <div className="modal-actions">

              <button
                className="save-btn"
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


              <button className="cancel-btn" onClick={() => setEditOption(null)}>
                取消
              </button>


            </div>

          </div>
        </div>
      )}
      {selectedOption && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedOption(null)}
        >
          <div
            className="detail-modal"
            onClick={(e) => e.stopPropagation()}
          >

            {/* 大圖片 */}
            {selectedOption.image_url && (
              <img
                src={selectedOption.image_url}
                className="detail-img"
              />
            )}

            {/* 標題 */}
            <h2>{selectedOption.title}</h2>

            {/* 介紹 */}
            <div className="detail-description">
              {selectedOption.description?.slice(0, MAX_DESCRIPTION)}

              {selectedOption.description?.length > MAX_DESCRIPTION && "..."}
            </div>

            {/* 投票 */}
            <button
              className="vote-btn"
              onClick={() => vote(selectedOption.id)}
            >
              👍
            </button>

          </div>
        </div>
      )}
      </div>

      
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