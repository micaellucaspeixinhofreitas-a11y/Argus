import { Link } from 'react-router-dom'
import { contact } from '../data'
import Icon from '../components/Icons'
import Magnetic from '../components/Magnetic'
import Glass from '../components/Glass'
import { useAuth } from '../lib/auth'

export default function Contact() {
  const { user } = useAuth()
  return (
    <section className="section contact" id="contato">
      <div className="contact__glow" aria-hidden="true" />
      <div className="container">
        <div className="cta card has-glass" data-reveal>
          <Glass radius={20} refract />
          <p className="eyebrow">// Comece agora</p>
          <h2 className="section-title contact__title">
            Seu próximo cliente está <span className="grad">no mapa.</span>
          </h2>
          <p className="section-text">
            Crie sua conta grátis, marque seu território e veja em minutos quais empresas da região têm mais
            aderência ao que você vende.
          </p>
          <div className="cta__actions">
            <Magnetic>
              <Link to={user ? '/app' : '/entrar?modo=cadastro'} className="btn btn--primary">
                {user ? 'Abrir plataforma' : 'Criar conta grátis'} <Icon name="arrow" size={18} />
              </Link>
            </Magnetic>
            <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer" className="cta__link">
              <Icon name="whatsapp" size={20} /> Falar com a equipe
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
