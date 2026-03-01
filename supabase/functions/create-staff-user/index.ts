
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        const { email, password, full_name, role } = await req.json()

        // 1. Create the user in Auth
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Mark as confirmed since admin created it
            user_metadata: { full_name }
        })

        if (authError) throw authError

        const userId = authData.user.id

        // 2. Create the profile
        const { error: profileError } = await supabaseClient
            .from('staff_profiles')
            .upsert({
                id: userId,
                full_name,
                email
            })

        if (profileError) throw profileError

        // 3. Assign the role
        const { error: roleError } = await supabaseClient
            .from('user_roles')
            .insert({
                user_id: userId,
                role: role.toLowerCase()
            })

        if (roleError) throw roleError

        return new Response(
            JSON.stringify({ message: "Staff user created successfully", user_id: userId }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
