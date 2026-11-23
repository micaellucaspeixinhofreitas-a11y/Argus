// Camada de pagamentos. Hoje: provedor "manual" (assinatura fica aguardando
// pagamento e o administrador ativa). Para ligar Mercado Pago ou Stripe, crie
// um provedor com createCheckout(subscription, plan) e o webhook que chama activate().

export function paymentProvider() {
  return process.env.PAYMENT_PROVIDER || 'manual'
}

export async function createCheckout() {
  if (paymentProvider() === 'manual') {
    return {
      provider: 'manual',
      checkout_url: null,
      message: 'Assinatura registrada. A cobrança por Pix ou cartão será liberada em breve; enquanto isso, o administrador pode ativar seu plano.',
    }
  }
  throw new Error('Provedor de pagamento não implementado.')
}

export const periodMonths = period => (period === 'quarterly' ? 3 : 1)
