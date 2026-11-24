import { Link } from 'react-router-dom'
import { nav } from '../data'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__top">
          <div className="footer__brand">
            <img src={`${import.meta.env.BASE_URL}argus-white.webp`} alt="Argus" className="footer__mark" width="1400" height="423" />
            <p>Prospecção comercial geolocalizada: encontre, qualifique e capture empresas no seu território.</p>
          </div>
          <nav className="footer__nav" aria-label="Rodapé">
            {nav.map(n => <a key={n.href} href={n.href}>{n.label}</a>)}
            <a href="/entrar">Entrar</a>
          </nav>
          <nav className="footer__legal" aria-label="Documentos legais">
            <Link to="/termos">Termos de Uso</Link>
            <Link to="/privacidade">Política de Privacidade</Link>
          </nav>
        </div>
        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} Argus. Todos os direitos reservados.</span>
          <a href="#top">Voltar ao topo ↑</a>
        </div>
      </div>
    </footer>
  )
}
