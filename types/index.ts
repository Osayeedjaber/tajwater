export interface Profile {
  id: string
  name: string
  email: string
  phone: string
  delivery_address: string
  zone_id: string
  avatar_url?: string
  wallet_balance: number
  created_at: string
}

export interface Zone {
  id: string
  name: string
  delivery_fee: number
  schedule: string
  active: boolean
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  stock: number
  category: string
  active: boolean
}

export interface Order {
  id: string
  user_id: string
  status: 'pending' | 'processing' | 'out_for_delivery' | 'delivered' | 'cancelled'
  total: number
  delivery_address: string
  zone_id: string
  created_at: string
  items?: OrderItem[]
  profile?: Profile
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  price: number
  product?: Product
}

export interface Subscription {
  id: string
  user_id: string
  frequency: 'weekly' | 'biweekly' | 'monthly'
  next_delivery: string
  status: 'active' | 'paused' | 'cancelled'
  quantity: number
  zone_id: string
  product_id: string
}

export interface SupportTicket {
  id: string
  user_id: string
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved'
  created_at: string
}

export interface AdminUser {
  id: string
  email: string
  role: 'super_admin' | 'manager' | 'delivery'
  name: string
}

export interface CartItem {
  product: Product
  quantity: number
  subscribeFrequency?: 'weekly' | 'biweekly' | 'monthly'
}

export interface DeliveryZone {
  name: string
  areas: string[]
  fee: number
  schedule: string
}
