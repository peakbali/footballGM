import { Card } from '../components';
import { transfersScreen } from '../tabs';

export function TransfersScreen() {
  return transfersScreen() ?? <Card title="Transfers"><div class="empty">Transfers arrive in the next update.</div></Card>;
}
