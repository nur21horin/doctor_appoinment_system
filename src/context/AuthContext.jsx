import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileReady, setProfileReady] = useState(false)
  const profileRef = useRef(null)

  const loadProfile = useCallback(async (user) => {
    if (!user) {
      profileRef.current = null
      setProfile(null)
      setProfileReady(true)
      return null
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (error) console.error(error)
    profileRef.current = data
    setProfile(data)
    setProfileReady(true)
    return data
  }, [])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session?.user)
      if (active) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      // only show a spinner when a *different* user signs in (not on token refresh)
      if (newSession?.user && profileRef.current?.id !== newSession.user.id) setProfileReady(false)
      // defer DB call outside the auth callback (recommended by supabase-js)
      setTimeout(() => loadProfile(newSession?.user), 0)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    setProfileReady(false)
    setSession(data.session)
    return loadProfile(data.user)
  }

  const signUp = async ({ fullName, email, phone, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    })
    if (error) throw error
    if (data.session) {
      setProfileReady(false)
      setSession(data.session)
      await loadProfile(data.user)
    }
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    isAdmin: profile?.role === 'admin',
    loading: loading || (Boolean(session?.user) && !profileReady),
    signIn,
    signUp,
    signOut,
    refreshProfile: () => loadProfile(session?.user),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
