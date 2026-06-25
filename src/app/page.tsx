import Link from 'next/link'

export default function HomePage() {
  return (
    <main>
      <h1>Cockpit</h1>
      <p>Walking skeleton: author an empty theme, then view it.</p>
      <ul>
        <li>
          <Link href="/admin">Admin workbench</Link>
        </li>
      </ul>
    </main>
  )
}
