import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default function App() {
  return (
    <div style={{padding: 40, fontFamily: 'sans-serif'}}>
      <h1>Test</h1>
      <p>URL: {import.meta.env.VITE_SUPABASE_URL || 'MISSING'}</p>
      <p>Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'present' : 'MISSING'}</p>
    </div>
  )
}
import ReactDOM from 'react-dom/client'

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
