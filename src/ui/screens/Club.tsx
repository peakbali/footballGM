import { Card } from '../components';
import { clubScreen } from '../tabs';

export function ClubScreen() {
  return clubScreen() ?? <Card title="Club"><div class="empty">Finances, staff and facilities arrive in the next update.</div></Card>;
}
