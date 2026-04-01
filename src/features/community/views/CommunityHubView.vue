<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import {
  useCommunityStore,
  type CommunityAuthorType,
  type CommunityModerationStatus,
  type CommunityPost
} from "@/features/community/store/community"
import { useAuthStore } from "@/features/auth/store/auth"

type MessageTone = "info" | "success" | "error"

const communityStore = useCommunityStore()
const authStore = useAuthStore()

const focusAreaOptions = [
  { value: "roadmaps", label: "Дорожные карты" },
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "ai", label: "AI / ML" },
  { value: "devops", label: "DevOps" },
  { value: "mobile", label: "Mobile" },
  { value: "career", label: "Карьера и интервью" }
]

const focusAreaLabels = focusAreaOptions.reduce<Record<string, string>>((acc, option) => {
  acc[option.value] = option.label
  return acc
}, {})

const moderationStatusLabel: Record<CommunityModerationStatus, string> = {
  pending: "На модерации",
  approved: "Опубликован",
  rejected: "Отклонен"
}

const showComposerAlert = ref(false)
const isSubmittingPost = ref(false)
const composerMessage = ref<string | null>(null)
const composerTone = ref<MessageTone>("info")
const commentInputs = ref<Record<string, string>>({})
const commentErrors = ref<Record<string, string>>({})

const guessedAuthorType = computed<CommunityAuthorType>(() => {
  const email = authStore.user?.email?.toLowerCase() ?? ""
  if (email.includes("company") || email.includes("hr") || email.includes("team")) {
    return "company"
  }
  return "developer"
})

const formatDisplayName = (raw: string) => {
  return raw
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ")
}

const currentAuthorName = computed(() => {
  const email = authStore.user?.email
  if (!email) return "Участник Skillo"
  const localPart = email.split("@")[0] ?? "Участник"
  const pretty = formatDisplayName(localPart)
  return pretty || "Участник Skillo"
})

const postDraft = ref({
  title: "",
  content: "",
  focusArea: "roadmaps",
  tags: "",
  authorType: guessedAuthorType.value as CommunityAuthorType
})

const publishedPosts = computed(() => communityStore.publishedPosts || [])

const myModerationPosts = computed(() => {
  const userId = authStore.user?.id ?? null
  if (userId === null) return []

  return communityStore.posts
    .filter((post) => post.authorUserId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})

const moderationQueueCount = computed(() => {
  return myModerationPosts.value.filter((post) => post.moderationStatus === "pending").length
})

const currentUserId = computed(() => authStore.user?.id ?? 0)
const hasAuthUser = computed(() => currentUserId.value > 0)

const formatDateTime = (isoDate: string | null) => {
  if (!isoDate) return "—"
  return new Date(isoDate).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}

const authorTypeLabel = (type: CommunityAuthorType) => {
  return type === "company" ? "Компания" : "Разработчик"
}

const isLikedByCurrentUser = (post: CommunityPost) => {
  if (!hasAuthUser.value) return false
  return post.likedByUserIds.includes(currentUserId.value)
}

const likePost = (post: CommunityPost) => {
  if (!authStore.user?.id) { 
    alert("Лайк басу үшін жүйеге кіріңіз")
    return
  }
  
  const userId = authStore.user.id
  communityStore.toggleLike(post.id, userId)
}

const submitComment = (postId: string) => {
  if (!authStore.user?.id) {
    alert("Комментарий жазу үшін жүйеге кіріңіз");
    return;
  }
  const nextText = (commentInputs.value[postId] ?? "").trim()
  if (nextText.length < 2) {
    commentErrors.value[postId] = "Комментарий слишком короткий."
    return
  }

  commentErrors.value[postId] = ""
  communityStore.addComment(postId, {
    authorName: currentAuthorName.value,
    authorType: guessedAuthorType.value,
    text: nextText
  })
  commentInputs.value[postId] = ""
}

const resetComposerForm = () => {
  postDraft.value.title = ""
  postDraft.value.content = ""
  postDraft.value.tags = ""
  postDraft.value.focusArea = "roadmaps"
  postDraft.value.authorType = guessedAuthorType.value
}

const openComposer = () => {
  showComposerAlert.value = true
  composerMessage.value = null
  composerTone.value = "info"
}

const closeComposer = () => {
  if (isSubmittingPost.value) return
  showComposerAlert.value = false
}

const parseTags = (value: string) => {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8)
}

const submitPost = async () => {
  // postDraft объектісінен деректерді аламыз
  if (!postDraft.value.title.trim() || !postDraft.value.content.trim()) return

  isSubmittingPost.value = true
  
  const payload = {
    title: postDraft.value.title,
    content: postDraft.value.content,
    focusArea: postDraft.value.focusArea,
    // Тегтерді массивке айналдыру
    tags: postDraft.value.tags.split(",").map(t => t.trim()).filter(t => t),
    authorName: authStore.user?.fullName || currentAuthorName.value,
    authorType: postDraft.value.authorType,
    authorUserId: authStore.user?.id || null
  }

  const result = await communityStore.submitPost(payload)

  if (result) {
    resetComposerForm() // Форманы тазарту
    composerMessage.value = "Пост модерацияға жіберілді!"
    composerTone.value = "success"
    
    // 3 секундтан кейін терезені жабу
    setTimeout(() => {
      showComposerAlert.value = false
      composerMessage.value = null
    }, 3000)
  } else {
    composerMessage.value = "Қате кетті, қайта көріңіз."
    composerTone.value = "error"
  }
  
  isSubmittingPost.value = false
}

onMounted(async () => {
  await communityStore.fetchPosts()
})
</script>

<template>
  <div class="community-page">
    <section class="hero-card">
      <div class="hero-main">
        <p class="hero-kicker">Сообщество Skillo</p>
        <h1>Новости, мнения и истории разработчиков и компаний</h1>
        <p class="hero-note">
          Публикуйте посты, обсуждайте их в комментариях, ставьте лайки. Каждый новый пост сначала проходит модерацию,
          и только после проверки появляется в общей ленте.
        </p>
      </div>
      <div class="hero-actions">
        <button type="button" class="community-btn community-btn--primary" @click="openComposer">
          Опубликовать пост
        </button>
      </div>
    </section>

    <section class="flow-note info-flow">
      <p>Полезные публикации обычно короткие и практичные: кейс, выводы и что стоит повторить другим.</p>
      <p>Регулярно делитесь опытом по вашему направлению, чтобы формировать сильный профиль в сообществе.</p>
    </section>

    <div class="community-layout">
      <section class="feed-panel">
        <header class="panel-head">
          <h2>Лента публикаций</h2>
          <span>{{ publishedPosts?.length || 0 }} постов</span>
        </header>

        <article
          v-for="post in publishedPosts"
          :key="post.id"
          class="community-post-card"
        >
          <div class="post-meta-row">
            <div class="meta-left">
              <span class="author-chip" :class="`author-chip--${post.authorType}`">
                {{ authorTypeLabel(post.authorType) }}
              </span>
              <strong>{{ post.authorName }}</strong>
            </div>
            <div class="meta-right">
              <span class="focus-chip">{{ focusAreaLabels[post.focusArea] ?? "Общее" }}</span>
              <span>{{ formatDateTime(post.publishedAt ?? post.createdAt) }}</span>
            </div>
          </div>

          <h3>{{ post.title }}</h3>
          <p class="post-content">{{ post.content }}</p>

          <div v-if="post.tags?.length" class="post-tags">
            <span v-for="tag in post.tags" :key="tag" class="tag-item">#{{ tag }}</span>
          </div>

          <div class="post-actions">
            <button
              type="button"
              class="community-btn community-btn--ghost"
              :class="{ active: isLikedByCurrentUser(post) }"
              :disabled="!hasAuthUser"
              @click="likePost(post)"
            >
              👍 {{ post.likes }}
            </button>
            <span>{{ post.comments?.length || 0 }} комментариев</span>
          </div>

          <div v-if="post.comments?.length" class="comments-list">
            <article
              v-for="comment in post.comments"
              :key="comment.id"
              class="comment-item"
            >
              <div class="comment-head">
                <strong>{{ comment.authorName }}</strong>
                <span class="comment-role">{{ authorTypeLabel(comment.authorType) }}</span>
                <span>{{ formatDateTime(comment.createdAt) }}</span>
              </div>
              <p>{{ comment.text }}</p>
            </article>
          </div>

          <form class="comment-form" @submit.prevent="submitComment(post.id)">
            <textarea
              v-model="commentInputs[post.id]"
              placeholder="Оставьте комментарий..."
              rows="3"
            />
            <div class="comment-actions">
              <span v-if="commentErrors[post.id]" class="comment-error">{{ commentErrors[post.id] }}</span>
              <button type="submit" class="community-btn community-btn--secondary">
                Отправить
              </button>
            </div>
          </form>
        </article>

        <p v-if="!publishedPosts.length" class="empty-note">
          Пока нет опубликованных постов. Опубликуйте первый пост в сообществе.
        </p>
      </section>

      <aside class="side-panel">
        <section class="moderation-card">
          <h2>Модерация моих постов</h2>
          <p>
            В очереди: <strong>{{ moderationQueueCount }}</strong>
          </p>

          <article
            v-for="post in myModerationPosts"
            :key="post.id"
            class="moderation-item"
          >
            <div class="moderation-head">
              <strong>{{ post.title }}</strong>
              <span class="moderation-badge" :class="`moderation-badge--${post.moderationStatus}`">
                {{ moderationStatusLabel[post.moderationStatus] }}
              </span>
            </div>
            <p>{{ formatDateTime(post.createdAt) }}</p>
            <small v-if="post.moderationNote">{{ post.moderationNote }}</small>
          </article>

          <p v-if="!myModerationPosts.length" class="empty-note">
            У вас пока нет публикаций. Создайте первый пост через кнопку «Опубликовать пост».
          </p>
        </section>

        <section class="rules-card">
          <h3>Правила публикаций</h3>
          <ul>
            <li>Пост должен быть связан с IT-направлениями платформы.</li>
            <li>Публикации с оффтопом и нерелевантной рекламой отклоняются.</li>
            <li>Чем конкретнее опыт и выводы, тем выше шанс пройти модерацию.</li>
          </ul>
        </section>
      </aside>
    </div>

    <transition name="composer-alert">
      <div
        v-if="showComposerAlert"
        class="composer-overlay"
        role="dialog"
        aria-modal="true"
        @click.self="closeComposer"
      >
        <div class="composer-card">
          <div class="composer-head">
            <h2>Новая публикация</h2>
            <button type="button" class="community-btn community-btn--ghost" @click="closeComposer">
              Закрыть
            </button>
          </div>

          <p class="composer-note">
            Этот блок открывается при входе на страницу как alert. После отправки пост сначала попадает на модерацию.
          </p>

          <div class="composer-grid">
            <label>
              Направление
              <select v-model="postDraft.focusArea">
                <option
                  v-for="option in focusAreaOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label>
              Тип автора
              <select v-model="postDraft.authorType">
                <option value="developer">Разработчик</option>
                <option value="company">Компания</option>
              </select>
            </label>
          </div>

          <label>
            Заголовок
            <input
              v-model="postDraft.title"
              type="text"
              placeholder="Например: Разбор backend-интервью после 2 недель подготовки"
            />
          </label>

          <label>
            Текст поста
            <textarea
              v-model="postDraft.content"
              rows="6"
              placeholder="Поделитесь новостью, мнением или историей: что вы сделали, какие выводы получили и что посоветуете другим."
            />
          </label>

          <label>
            Теги (через запятую)
            <input
              v-model="postDraft.tags"
              type="text"
              placeholder="например: Interview, Backend, API"
            />
          </label>

          <div class="composer-actions">
            <button
              type="button"
              class="community-btn community-btn--secondary"
              :disabled="isSubmittingPost"
              @click="resetComposerForm"
            >
              Очистить
            </button>
            <button
              type="button"
              class="community-btn community-btn--primary"
              :disabled="isSubmittingPost"
              @click="submitPost"
            >
              {{ isSubmittingPost ? "Проверяем..." : "Опубликовать" }}
            </button>
          </div>

          <p
            v-if="composerMessage"
            class="composer-message"
            :class="`composer-message--${composerTone}`"
          >
            {{ composerMessage }}
          </p>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.community-page {
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.flow-note {
  padding: 0 4px;
}

.hero-card {
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.hero-main {
  max-width: 74ch;
}

.hero-kicker {
  margin: 0 0 6px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 11px;
}

.hero-card h1 {
  margin: 0 0 8px;
  font-size: 30px;
  line-height: 1.1;
  color: var(--text);
}

.hero-note {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
}

.hero-actions {
  display: flex;
  align-items: flex-start;
}

.community-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
  gap: 18px;
}

.feed-panel,
.side-panel section {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
}

.feed-panel {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.panel-head h2 {
  margin: 0;
  color: var(--text);
  font-size: 18px;
}

.panel-head span {
  color: var(--muted);
  font-size: 12px;
}

.community-post-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.post-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.meta-left,
.meta-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-left strong {
  color: var(--text);
  font-size: 13px;
}

.meta-right span {
  color: var(--muted);
  font-size: 12px;
}

.author-chip,
.focus-chip,
.tag-item {
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 11px;
  padding: 3px 8px;
  color: var(--text);
  background: var(--surface);
  white-space: nowrap;
}

.author-chip--company {
  border-color: #1d4ed8;
  color: #1d4ed8;
  background: rgba(29, 78, 216, 0.08);
}

.author-chip--developer {
  border-color: #15803d;
  color: #15803d;
  background: rgba(21, 128, 61, 0.08);
}

.community-post-card h3 {
  margin: 0;
  color: var(--text);
  font-size: 18px;
  line-height: 1.25;
}

.post-content {
  margin: 0;
  color: var(--text);
  font-size: 14px;
  line-height: 1.55;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.post-actions {
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--muted);
  font-size: 12px;
}

.post-actions .community-btn {
  padding: 6px 10px !important;
  font-size: 12px;
}

.post-actions .community-btn.active {
  border-color: #f59e0b !important;
  background: rgba(245, 158, 11, 0.16) !important;
  color: #b45309 !important;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-top: 1px dashed var(--border);
  padding-top: 8px;
}

.comment-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  padding: 8px;
}

.comment-head {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 11px;
  margin-bottom: 4px;
}

.comment-head strong {
  color: var(--text);
  font-size: 12px;
}

.comment-role {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 2px 6px;
}

.comment-item p {
  margin: 0;
  color: var(--text);
  font-size: 13px;
}

.comment-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.comment-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.comment-error {
  color: #dc2626;
  font-size: 12px;
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.moderation-card,
.rules-card {
  padding: 12px;
}

.moderation-card h2,
.rules-card h3 {
  margin: 0 0 6px;
  font-size: 17px;
  color: var(--text);
}

.moderation-card > p {
  margin: 0 0 8px;
  color: var(--muted);
  font-size: 13px;
}

.moderation-item {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 8px;
  margin-bottom: 8px;
}

.moderation-item:last-child {
  margin-bottom: 0;
}

.moderation-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 3px;
}

.moderation-head strong {
  color: var(--text);
  font-size: 13px;
}

.moderation-item p {
  margin: 0 0 4px;
  color: var(--muted);
  font-size: 12px;
}

.moderation-item small {
  color: var(--muted);
  font-size: 12px;
}

.moderation-badge {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  white-space: nowrap;
}

.moderation-badge--pending {
  border-color: #d97706;
  color: #b45309;
  background: rgba(217, 119, 6, 0.1);
}

.moderation-badge--approved {
  border-color: #15803d;
  color: #15803d;
  background: rgba(21, 128, 61, 0.1);
}

.moderation-badge--rejected {
  border-color: #dc2626;
  color: #dc2626;
  background: rgba(220, 38, 38, 0.1);
}

.rules-card ul {
  margin: 0;
  padding-left: 16px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.empty-note {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.community-btn {
  border-radius: 10px !important;
  font-size: 13px;
  font-weight: 700;
}

.community-btn--primary {
  min-width: 180px;
}

.community-btn--secondary,
.community-btn--ghost {
  background: var(--surface) !important;
  border-color: var(--border) !important;
  color: var(--text) !important;
}

.community-btn--secondary:hover,
.community-btn--ghost:hover {
  background: var(--surface-soft) !important;
  border-color: var(--soft-border) !important;
  color: var(--text) !important;
}

.composer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(9, 12, 17, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 16px;
}

.composer-card {
  width: min(760px, 100%);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--surface) 0%, var(--surface-soft) 100%);
  padding: 14px;
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.composer-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.composer-head h2 {
  margin: 0;
  color: var(--text);
  font-size: 22px;
}

.composer-note {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.composer-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.composer-card label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--text);
}

.composer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.composer-message {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.composer-message--info {
  color: var(--muted);
}

.composer-message--success {
  color: #15803d;
}

.composer-message--error {
  color: #dc2626;
}

.composer-alert-enter-active,
.composer-alert-leave-active {
  transition: opacity 0.2s ease;
}

.composer-alert-enter-from,
.composer-alert-leave-to {
  opacity: 0;
}

@media (max-width: 940px) {
  .community-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .hero-card {
    flex-direction: column;
  }

  .hero-card h1 {
    font-size: 24px;
  }

  .composer-grid {
    grid-template-columns: 1fr;
  }

  .post-meta-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .meta-right {
    flex-wrap: wrap;
  }

  .comment-actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
