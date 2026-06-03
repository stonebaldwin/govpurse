import { Button } from '@govpurse/ui';
import { openBillingPortal } from '@/lib/billing-actions';

export function ManageBillingButton() {
  return (
    <form action={openBillingPortal}>
      <Button type="submit" variant="secondary">
        Manage billing
      </Button>
    </form>
  );
}
