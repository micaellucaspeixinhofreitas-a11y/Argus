import Icon from '../components/Icons'
import SpecularLink from '../components/SpecularLink'
import { useAuth } from '../lib/auth'

export default function Contact() {
  const { user } = useAuth()
  return (
    <section className="section contact" id="contato">
      <div className="contact__glow" aria-hidden="true" />
      <div className="container">
        <div className="cta card" data-reveal>
          <p className="eyebrow">// Comece agora</p>
          <h2 className="section-title contact__title">
            Seu próximo cliente está <span className="grad">no mapa.</span>
          </h2>
          <p className="section-text">
            Crie sua conta grátis, marque seu território e veja em minutos quais empresas da região têm mais
            aderência ao que você vende.
          </p>
          <p className="cta__myth">Na mitologia grega, Argus era o gigante de cem olhos que nada deixava escapar. A plataforma nasceu dessa ideia.</p>
          <div className="cta__actions">
            <SpecularLink to={user ? '/app' : '/entrar?modo=cadastro'}>
              {user ? 'Abrir plataforma' : 'Criar conta grátis'} <Icon name="arrow" size={18} />
            </SpecularLink>
          </div>
        </div>
      </div>
    </section>
  )
}
