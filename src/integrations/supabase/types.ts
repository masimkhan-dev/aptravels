export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            audit_logs: {
                Row: {
                    id: string
                    table_name: string
                    record_id: string
                    action: 'INSERT' | 'UPDATE' | 'VOID' | 'DELETE'
                    performed_by: string | null
                    performed_at: string
                    notes: string | null
                }
                Insert: {
                    id?: string
                    table_name: string
                    record_id: string
                    action: 'INSERT' | 'UPDATE' | 'VOID' | 'DELETE'
                    performed_by?: string | null
                    performed_at?: string
                    notes?: string | null
                }
                Update: {
                    id?: string
                    table_name?: string
                    record_id?: string
                    action?: 'INSERT' | 'UPDATE' | 'VOID' | 'DELETE'
                    performed_by?: string | null
                    performed_at?: string
                    notes?: string | null
                }
                Relationships: []
            }
            bookings: {
                Row: {
                    id: string
                    customer_id: string | null
                    package_id: string | null
                    assigned_to: string | null
                    invoice_no: string | null
                    total_price: number
                    travel_date: string | null
                    status: 'Draft' | 'Confirmed' | 'Completed' | 'Voided'
                    booking_type: 'Package' | 'Ticket' | 'Visa'
                    pnr_number: string | null
                    airline_name: string | null
                    ticket_sector: string | null
                    visa_country: string | null
                    visa_profession: string | null
                    visa_step_passport_received: boolean
                    visa_step_medical_cleared: boolean
                    visa_step_enumber_generated: boolean
                    visa_step_protector_stamp: boolean
                    visa_step_final_stamping: boolean
                    margin: number | null
                    deleted_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    customer_id?: string | null
                    package_id?: string | null
                    assigned_to?: string | null
                    invoice_no?: string | null
                    total_price?: number
                    travel_date?: string | null
                    status?: 'Draft' | 'Confirmed' | 'Completed' | 'Voided'
                    booking_type?: 'Package' | 'Ticket' | 'Visa'
                    pnr_number?: string | null
                    airline_name?: string | null
                    ticket_sector?: string | null
                    visa_country?: string | null
                    visa_profession?: string | null
                    visa_step_passport_received?: boolean
                    visa_step_medical_cleared?: boolean
                    visa_step_enumber_generated?: boolean
                    visa_step_protector_stamp?: boolean
                    visa_step_final_stamping?: boolean
                    margin?: number | null
                    deleted_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    customer_id?: string | null
                    package_id?: string | null
                    assigned_to?: string | null
                    invoice_no?: string | null
                    total_price?: number
                    travel_date?: string | null
                    status?: 'Draft' | 'Confirmed' | 'Completed' | 'Voided'
                    booking_type?: 'Package' | 'Ticket' | 'Visa'
                    pnr_number?: string | null
                    airline_name?: string | null
                    ticket_sector?: string | null
                    visa_country?: string | null
                    visa_profession?: string | null
                    visa_step_passport_received?: boolean
                    visa_step_medical_cleared?: boolean
                    visa_step_enumber_generated?: boolean
                    visa_step_protector_stamp?: boolean
                    visa_step_final_stamping?: boolean
                    margin?: number | null
                    deleted_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "bookings_customer_id_fkey"
                        columns: ["customer_id"]
                        isOneToOne: false
                        referencedRelation: "customers"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "bookings_package_id_fkey"
                        columns: ["package_id"]
                        isOneToOne: false
                        referencedRelation: "packages"
                        referencedColumns: ["id"]
                    }
                ]
            }
            customers: {
                Row: {
                    id: string
                    full_name: string
                    phone: string
                    email: string | null
                    address: string | null
                    cnic_passport: string | null
                    deleted_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    full_name: string
                    phone: string
                    email?: string | null
                    address?: string | null
                    cnic_passport?: string | null
                    deleted_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    full_name?: string
                    phone?: string
                    email?: string | null
                    address?: string | null
                    cnic_passport?: string | null
                    deleted_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            gallery: {
                Row: {
                    id: string
                    image_url: string
                    alt: string
                    category: string
                    is_active: boolean
                    sort_order: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    image_url: string
                    alt: string
                    category?: string
                    is_active?: boolean
                    sort_order?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    image_url?: string
                    alt?: string
                    category?: string
                    is_active?: boolean
                    sort_order?: number
                    created_at?: string
                }
                Relationships: []
            }
            gallery_categories: {
                Row: {
                    id: string
                    name: string
                    label_urdu: string | null
                    sort_order: number
                }
                Insert: {
                    id?: string
                    name: string
                    label_urdu?: string | null
                    sort_order?: number
                }
                Update: {
                    id?: string
                    name?: string
                    label_urdu?: string | null
                    sort_order?: number
                }
                Relationships: []
            }
            inquiries: {
                Row: {
                    id: string
                    name: string
                    email: string
                    phone: string
                    message: string
                    package_interest: string | null
                    is_read: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    email: string
                    phone: string
                    message: string
                    package_interest?: string | null
                    is_read?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    email?: string
                    phone?: string
                    message?: string
                    package_interest?: string | null
                    is_read?: boolean
                    created_at?: string
                }
                Relationships: []
            }
            invoice_sequences: {
                Row: {
                    year: number
                    last_value: number
                }
                Insert: {
                    year: number
                    last_value?: number
                }
                Update: {
                    year?: number
                    last_value?: number
                }
                Relationships: []
            }
            packages: {
                Row: {
                    id: string
                    title: string
                    description: string
                    destination: string
                    price: number
                    duration: string
                    image_url: string | null
                    is_popular: boolean
                    is_active: boolean
                    inclusions: string[]
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    title: string
                    description: string
                    destination: string
                    price: number
                    duration: string
                    image_url?: string | null
                    is_popular?: boolean
                    is_active?: boolean
                    inclusions?: string[]
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    title?: string
                    description?: string
                    destination?: string
                    price?: number
                    duration?: string
                    image_url?: string | null
                    is_popular?: boolean
                    is_active?: boolean
                    inclusions?: string[]
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            payments: {
                Row: {
                    id: string
                    booking_id: string | null
                    amount_paid: number
                    payment_method: string
                    reference_no: string | null
                    payment_date: string
                    voided: boolean
                    void_reason: string | null
                }
                Insert: {
                    id?: string
                    booking_id?: string | null
                    amount_paid: number
                    payment_method?: string
                    reference_no?: string | null
                    payment_date?: string
                    voided?: boolean
                    void_reason?: string | null
                }
                Update: {
                    id?: string
                    booking_id?: string | null
                    amount_paid?: number
                    payment_method?: string
                    reference_no?: string | null
                    payment_date?: string
                    voided?: boolean
                    void_reason?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "payments_booking_id_fkey"
                        columns: ["booking_id"]
                        isOneToOne: false
                        referencedRelation: "bookings"
                        referencedColumns: ["id"]
                    }
                ]
            }
            services: {
                Row: {
                    id: string
                    title: string
                    description: string
                    icon: string
                    is_active: boolean
                    sort_order: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    title: string
                    description: string
                    icon?: string
                    is_active?: boolean
                    sort_order?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    title?: string
                    description?: string
                    icon?: string
                    is_active?: boolean
                    sort_order?: number
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            staff_profiles: {
                Row: {
                    id: string
                    full_name: string
                    email: string
                    created_at: string
                }
                Insert: {
                    id: string
                    full_name: string
                    email: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    full_name?: string
                    email?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "staff_profiles_id_fkey"
                        columns: ["id"]
                        isOneToOne: true
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            user_roles: {
                Row: {
                    id: string
                    user_id: string
                    role: AppRole
                }
                Insert: {
                    id?: string
                    user_id: string
                    role: AppRole
                }
                Update: {
                    id?: string
                    user_id?: string
                    role?: AppRole
                }
                Relationships: [
                    {
                        foreignKeyName: "user_roles_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: true
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            booking_ledger_view: {
                Row: {
                    booking_id: string | null
                    invoice_no: string | null
                    customer_name: string | null
                    total_price: number | null
                    total_paid: number | null
                    balance_due: number | null
                    status: string | null
                    booking_type: string | null
                    pnr_number: string | null
                    visa_country: string | null
                }
                Relationships: []
            }
            daily_cash_summary: {
                Row: {
                    ledger_date: string | null
                    payment_method: string | null
                    total_transactions: number | null
                    daily_inflow: number | null
                }
                Relationships: []
            }
        }
        Functions: {
            check_staff_email_exists: {
                Args: { p_email: string }
                Returns: boolean
            }
            has_role: {
                Args: { _user_id: string; _role: AppRole }
                Returns: boolean
            }
            get_daily_cash: {
                Args: Record<PropertyKey, never>
                Returns: {
                    ledger_date: string | null
                    payment_method: string | null
                    total_transactions: number | null
                    daily_inflow: number | null
                }[]
            }
        }
        Enums: {
            app_role: 'admin' | 'manager' | 'sales' | 'ops'
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

// Convenience type aliases
export type AppRole = Database['public']['Enums']['app_role']

export type Tables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Update']

export type Enums<T extends keyof Database['public']['Enums']> =
    Database['public']['Enums'][T]
