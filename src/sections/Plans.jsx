import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icons'
import Magnetic from '../components/Magnetic'
import SectionHead from './SectionHead'
import { api, money, fmtInt } from '../lib/api'
import { useAuth } from '../lib/auth'
import Glass from '../components/Glass'

// Planos vêm do banco (configuráveis no painel admin)
export default function Plans() {
  const { user } = useAuth()
  const [plans, setPlans] = useState(null)
  const [period, setPeriod] = useState('monthly')

  useEffect(() => {
    api('plans').then(d => setPlans(d.plans)).catch(() => setPlans([]))
  }, [])

  const featuredId = plans?.find(p => p.price_monthly_cents > 0)?.id

  return (
    <section className="section" id="planos">
      <div className="container">
        <SectionHead
          center
          eyebrow="// Planos"
          title={<>Créditos claros, <span className="grad">sem surpresas.</span></>}
          text="Mapear é livre. Você só usa créditos ao capturar um lead novo — e lead repetido nunca é cobrado."
        />
        <div className="period-toggle" role="tablist" data-reveal>
          <button role="tab" aria-selected={period === 'monthly'} className={period === 'monthly' ? 'is-on' : ''} onClick={() => setPeriod('monthly')}>Mensal</button>
          <button role="tab" aria-selected={period === 'quarterly'} className={period === 'quarterly' ? 'is-on' : ''} onClick={() => setPeriod('quarterly')}>Trimestral</button>
        </div>
        {plans === null && <p className="muted center">Carregando planos…</p>}
        {plans?.length === 0 && <p className="muted center">Os planos aparecem aqui assim que o banco de dados estiver conectado.</p>}
        <div className="plans">
          {plans?.map(p => {
            const featured = p.id === featuredId
            const cents = period === 'quarterly' ? p.price_quarterly_cents : p.price_monthly_cents
            const free = p.price_monthly_cents === 0 && p.price_quarterly_cents === 0
            return (
              <article className={`card plan has-glass ${featured ? 'is-featured' : ''}`} key={p.id}>
                <Glass radius={20} />
                {featured && <span className="plan__badge">Mais escolhido</span>}
                <h3 className="plan__name">{p.name}</h3>
                <p className="plan__desc">{p.description}</p>
                <div className="plan__price">
                  <strong>{free ? 'Grátis' : money(cents)}</strong>
                  <span>{free ? 'para sempre' : period === 'quarterly' ? 'por trimestre' : 'por mês'}</span>
                </div>
                <ul className="plan__list">
                  <li><Icon name="check" size={18} /> {fmtInt(p.monthly_credits)} créditos por mês</li>
                  <li><Icon name="check" size={18} /> Até {fmtInt(p.daily_limit)} leads por dia</li>
                  {(p.features || []).filter(f => !/créditos por mês|leads por dia/i.test(f)).map(f => (
                    <li key={f}><Icon name="check" size={18} /> {f}</li>
                  ))}
                </ul>
                <Magnetic strength={0.2}>
                  <Link
                    to={user ? '/app/planos' : `/entrar?modo=cadastro&plano=${p.id}`}
                    className={`btn ${featured ? 'btn--primary' : 'btn--ghost'} btn--block`}
                  >
                    {free ? 'Criar conta grátis' : 'Assinar'}
                  </Link>
                </Magnetic>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
