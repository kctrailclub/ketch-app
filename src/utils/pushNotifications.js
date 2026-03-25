import { getVapidPublicKey, subscribePush } from '../api/client';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) array[i] = raw.charCodeAt(i);
  return array;
}

export async function registerPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const reg = await navigator.serviceWorker.ready;

    // Check if already subscribed
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await subscribePush(existing.toJSON());
      return;
    }

    // Get VAPID public key from server
    const { data } = await getVapidPublicKey();
    if (!data.public_key) return;

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    // Subscribe
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.public_key),
    });

    // Send subscription to backend
    await subscribePush(subscription.toJSON());
  } catch (err) {
    console.error('Push registration failed:', err);
  }
}
