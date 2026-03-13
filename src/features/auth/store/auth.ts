import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi } from '@/features/auth/api/auth.api'
import type { AuthResponse, CompanyProfile, LoginPayload, RegisterPayload, UserRole } from '@/shared/api/client'

interface User {
  id: number
  email: string
  role: UserRole
  firstLogin: boolean
  createdAt: string
  country: string
  city: string
  university: string
  companyProfile: CompanyProfile | null
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const savedUser = localStorage.getItem('user')
  const user = ref<User | null>(savedUser ? JSON.parse(savedUser) : null)
  
  const isFirstLogin = ref<boolean>(user.value?.firstLogin ?? true)

  const fetchMe = async () => {
    if (!token.value) return

    try {
      const response = await authApi.getMe()
      user.value = response
      isFirstLogin.value = response.firstLogin
      
      // Деректерді жаңартып, localStorage-қа сақтап қоямыз
      localStorage.setItem('user', JSON.stringify(response))
    } catch (error) {
      console.error('Сессия аяқталды немесе қате кетті:', error)
      logout() // Егер токен жарамсыз болса, жүйеден шығарамыз
    }
  }

  // ===== ACTIONS =====
  const login = async (payload: LoginPayload) => {
    const response: AuthResponse | undefined = await authApi.login(payload)

    if (!response) {
      throw new Error('Login failed: response is undefined')
    }

    token.value = response.token
    user.value = response.user
    isFirstLogin.value = response.user.firstLogin

    localStorage.setItem('token', response.token)
    localStorage.setItem('user', JSON.stringify(response.user))

    return response
  }

  const register = async (payload: RegisterPayload) => {
    const response: AuthResponse | undefined = await authApi.register(payload)

    if (!response) {
      throw new Error('Register failed: response is undefined')
    }

    token.value = response.token
    user.value = response.user
    isFirstLogin.value = response.user.firstLogin

    localStorage.setItem('token', response.token)

    return response
  }

  const logout = () => {
    token.value = null
    user.value = null
    isFirstLogin.value = true
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const setOnboardingDone = () => {
    isFirstLogin.value = false
    if (user.value) {
      user.value.firstLogin = false
      localStorage.setItem('user', JSON.stringify(user.value)) // Жаңартылған күйін сақтау
    }
  }

  const setAuth = (newToken: string, newUser: User) => {
    token.value = newToken
    user.value = newUser
    isFirstLogin.value = newUser.firstLogin
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
  }


  return {
    token,
    user,
    isFirstLogin,
    fetchMe,
    login,
    register,
    logout,
    setOnboardingDone,
    setAuth
  }
})
