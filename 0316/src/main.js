import './style.css'

function startLiveClock() {
  const clockEl = document.getElementById('live-clock')
  if (!clockEl) return

  function update() {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    clockEl.textContent = `${hours}:${minutes}:${seconds}`
  }

  update()
  setInterval(update, 1000)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startLiveClock)
} else {
  startLiveClock()
}
