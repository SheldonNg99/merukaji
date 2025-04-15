import { redirect } from 'next/navigation';

export default function Page() {
  // Redirect to the authenticated version of the homepage
  redirect('/home');
}
