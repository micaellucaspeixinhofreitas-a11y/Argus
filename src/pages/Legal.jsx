import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { contact } from '../data'

const UPDATED = '24/11/2026'

function Privacy() {
  return (
    <>
      <img className="legal__icon" src="/icons/olho.webp" alt="" width="64" height="64" />
      <h1>Política de Privacidade</h1>
      <p className="legal__meta">Última atualização: {UPDATED}</p>
      <p>
        Esta política explica quais dados pessoais a Argus coleta, para que usa, com quem compartilha e quais são os seus
        direitos, conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
      </p>

      <h2>1. Dados que coletamos</h2>
      <ul>
        <li><strong>Cadastro:</strong> nome, e-mail e senha (guardada apenas de forma criptografada, com hash e sal — nunca temos acesso à senha em texto).</li>
        <li><strong>Uso da plataforma:</strong> configurações de prospecção (segmentos, localidades, áreas no mapa), buscas salvas, leads capturados e o histórico de créditos.</li>
        <li><strong>Pagamentos:</strong> plano escolhido, valor, referência do pedido Pix e datas. Não recebemos nem guardamos dados bancários ou de cartão.</li>
        <li><strong>Dados técnicos:</strong> registros de acesso e de segurança (como data, hora e tentativas de login), necessários para proteger a conta e cumprir o Marco Civil da Internet.</li>
      </ul>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>Criar e manter sua conta e permitir o login com segurança.</li>
        <li>Executar os mapeamentos, calcular créditos e mostrar seus resultados.</li>
        <li>Processar assinaturas e confirmar pagamentos.</li>
        <li>Enviar e-mails essenciais, como o de redefinição de senha.</li>
        <li>Prevenir fraudes, abusos e acessos indevidos.</li>
      </ul>
      <p>
        As bases legais são a execução do contrato (art. 7º, V), o cumprimento de obrigação legal (art. 7º, II) e o legítimo
        interesse na segurança da plataforma (art. 7º, IX). Não vendemos seus dados e não os usamos para publicidade de terceiros.
      </p>

      <h2>3. Dados das empresas mapeadas</h2>
      <p>
        As informações de estabelecimentos exibidas no mapa (nome, categoria, endereço, telefone e site) vêm de fontes públicas
        de dados geográficos e de estabelecimentos comerciais. Quem usa esses contatos é responsável por abordá-los de forma
        lícita, respeitando a LGPD, o Código de Defesa do Consumidor e as regras contra mensagens não solicitadas.
      </p>

      <h2>4. Com quem compartilhamos</h2>
      <p>Apenas com fornecedores necessários para o serviço funcionar, que tratam os dados em nosso nome:</p>
      <ul>
        <li>Hospedagem e banco de dados (Vercel e Neon).</li>
        <li>Mapas e dados de estabelecimentos (CARTO, OpenStreetMap e TomTom) — recebem as áreas pesquisadas, não seus dados de cadastro.</li>
        <li>Envio de e-mails transacionais (Resend).</li>
      </ul>
      <p>Alguns desses fornecedores podem armazenar dados fora do Brasil, com as garantias previstas na LGPD.</p>

      <h2>5. Cookies e armazenamento local</h2>
      <p>
        Usamos apenas um cookie essencial de sessão (<code>argus_session</code>), protegido (httpOnly), para manter você
        conectado. O navegador também guarda localmente o rascunho da sua prospecção e a confirmação deste aviso. Não usamos
        cookies de publicidade nem de rastreamento.
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <p>
        Enquanto sua conta estiver ativa. Registros de acesso são mantidos por 6 meses, como exige o Marco Civil da Internet, e
        dados de pagamento pelo prazo exigido pela legislação fiscal. Ao excluir a conta, os demais dados são apagados.
      </p>

      <h2>7. Segurança</h2>
      <p>
        Conexão sempre criptografada (HTTPS), senhas com hash, sessão assinada, limite de tentativas de login, links de
        redefinição de senha de uso único e com validade curta, e isolamento dos dados de cada conta.
      </p>

      <h2>8. Seus direitos</h2>
      <p>
        Você pode pedir confirmação do tratamento, acesso, correção, portabilidade, anonimização ou exclusão dos seus dados, e
        revogar consentimentos (art. 18 da LGPD), pelo e-mail <a href={`mailto:${contact.email}`}>{contact.email}</a>.
        Também é possível reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
      </p>

      <h2>9. Alterações</h2>
      <p>Podemos atualizar esta política. Mudanças relevantes serão avisadas na plataforma ou por e-mail.</p>
    </>
  )
}

function Terms() {
  return (
    <>
      <img className="legal__icon" src="/icons/martelo.webp" alt="" width="64" height="64" />
      <h1>Termos de Uso</h1>
      <p className="legal__meta">Última atualização: {UPDATED}</p>
      <p>Ao criar uma conta ou usar a Argus, você concorda com estes termos. Se não concordar, não use a plataforma.</p>

      <h2>1. O serviço</h2>
      <p>
        A Argus é uma plataforma de prospecção comercial geolocalizada: permite definir segmentos e territórios, mapear
        estabelecimentos a partir de fontes públicas, qualificá-los e capturá-los como leads.
      </p>

      <h2>2. Sua conta</h2>
      <ul>
        <li>Você precisa ter 18 anos ou mais e fornecer informações verdadeiras.</li>
        <li>A conta é pessoal; você é responsável por manter a senha em sigilo e por tudo o que for feito com ela.</li>
        <li>Avise-nos imediatamente se suspeitar de uso indevido.</li>
      </ul>

      <h2>3. Planos, créditos e pagamento</h2>
      <ul>
        <li>Cada novo lead capturado consome 1 crédito; capturar de novo uma empresa que já é sua não consome créditos.</li>
        <li>Os créditos e limites de cada plano são os informados na tela de planos. Créditos não usados não acumulam para o mês seguinte.</li>
        <li>Planos pagos são liberados após a confirmação do pagamento e valem pelo período contratado (mensal ou trimestral).</li>
        <li>Você pode cancelar a renovação quando quiser e mantém o acesso até o fim do período já pago.</li>
        <li>O direito de arrependimento de 7 dias (art. 49 do CDC) é garantido para a primeira contratação.</li>
      </ul>

      <h2>4. Uso permitido</h2>
      <p>É proibido:</p>
      <ul>
        <li>Usar os dados para spam, mensagens em massa não solicitadas, assédio, golpes ou qualquer atividade ilegal.</li>
        <li>Revender ou redistribuir em massa a base de dados obtida pela plataforma.</li>
        <li>Tentar burlar limites, créditos, a segurança ou o acesso a dados de outras contas.</li>
        <li>Automatizar o uso (robôs, scripts) ou sobrecarregar o serviço.</li>
      </ul>
      <p>O descumprimento pode levar à suspensão ou ao encerramento da conta, sem reembolso.</p>

      <h2>5. Dados das empresas</h2>
      <p>
        As informações vêm de fontes públicas e de terceiros e podem estar incompletas ou desatualizadas. Não garantimos
        resultados comerciais. Você é responsável pelo uso que fizer dos contatos, incluindo o cumprimento da LGPD.
      </p>

      <h2>6. Disponibilidade e responsabilidade</h2>
      <p>
        Trabalhamos para manter a plataforma estável, mas podem ocorrer interrupções para manutenção ou por falhas de
        fornecedores. Na extensão permitida pela lei, nossa responsabilidade se limita ao valor pago nos últimos 3 meses.
      </p>

      <h2>7. Encerramento</h2>
      <p>Você pode pedir a exclusão da conta a qualquer momento pelo e-mail <a href={`mailto:${contact.email}`}>{contact.email}</a>.</p>

      <h2>8. Alterações e lei aplicável</h2>
      <p>
        Podemos atualizar estes termos, avisando com antecedência mudanças relevantes. Aplica-se a lei brasileira, e fica eleito o
        foro do domicílio do consumidor.
      </p>
      <p>Veja também a <Link to="/privacidade">Política de Privacidade</Link>.</p>
    </>
  )
}

export default function Legal({ doc }) {
  useEffect(() => { window.scrollTo(0, 0) }, [doc])
  return (
    <main className="legal">
      <div className="legal__glow" aria-hidden="true" />
      <div className="legal__wrap">
        <Link to="/" className="legal__brand" aria-label="Argus — início">
          <img src="/argus-white.webp" alt="Argus" width="1400" height="423" />
        </Link>
        <article className="legal__doc card">{doc === 'terms' ? <Terms /> : <Privacy />}</article>
        <nav className="legal__nav">
          <Link to="/">Página inicial</Link>
          <Link to="/termos">Termos de Uso</Link>
          <Link to="/privacidade">Política de Privacidade</Link>
        </nav>
      </div>
    </main>
  )
}
