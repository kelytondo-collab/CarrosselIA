const GRAPH_API = 'https://graph.facebook.com/v21.0'

export async function getInstagramAccount(accessToken: string): Promise<{ id: string; username: string } | null> {
  // Get user's Facebook Pages
  const pagesRes = await fetch(`${GRAPH_API}/me/accounts?access_token=${accessToken}`)
  const pagesData = await pagesRes.json() as any
  if (!pagesData.data?.length) return null

  // Try each page to find an Instagram Business Account
  for (const page of pagesData.data) {
    const igRes = await fetch(`${GRAPH_API}/${page.id}?fields=instagram_business_account&access_token=${accessToken}`)
    const igData = await igRes.json() as any

    if (igData.instagram_business_account?.id) {
      // Get username
      const profileRes = await fetch(`${GRAPH_API}/${igData.instagram_business_account.id}?fields=username&access_token=${accessToken}`)
      const profileData = await profileRes.json() as any
      return {
        id: igData.instagram_business_account.id,
        username: profileData.username || 'unknown',
      }
    }
  }

  return null
}

export async function createContainer(
  igAccountId: string,
  accessToken: string,
  imageUrl: string,
  caption?: string,
  isCarouselItem = false
): Promise<string> {
  const params = new URLSearchParams({
    image_url: imageUrl,
    access_token: accessToken,
  })
  if (caption) params.set('caption', caption)
  if (isCarouselItem) params.set('is_carousel_item', 'true')

  const res = await fetch(`${GRAPH_API}/${igAccountId}/media`, {
    method: 'POST',
    body: params,
  })
  const data = await res.json() as any
  if (data.error) throw new Error(data.error.message)
  return data.id
}

export async function createCarouselContainer(
  igAccountId: string,
  accessToken: string,
  childIds: string[],
  caption: string
): Promise<string> {
  const params = new URLSearchParams({
    media_type: 'CAROUSEL',
    children: childIds.join(','),
    caption,
    access_token: accessToken,
  })

  const res = await fetch(`${GRAPH_API}/${igAccountId}/media`, {
    method: 'POST',
    body: params,
  })
  const data = await res.json() as any
  if (data.error) throw new Error(data.error.message)
  return data.id
}

export async function waitForContainer(containerId: string, accessToken: string, maxWait = 60000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    const res = await fetch(`${GRAPH_API}/${containerId}?fields=status_code&access_token=${accessToken}`)
    const data = await res.json() as any
    if (data.status_code === 'FINISHED') return
    if (data.status_code === 'ERROR') throw new Error('Instagram rejeitou a imagem: ' + (data.status || 'erro desconhecido'))
    await new Promise(r => setTimeout(r, 2000))
  }
  throw new Error('Timeout aguardando processamento do Instagram')
}

export async function publishContainer(
  igAccountId: string,
  accessToken: string,
  containerId: string
): Promise<{ id: string; permalink?: string }> {
  const params = new URLSearchParams({
    creation_id: containerId,
    access_token: accessToken,
  })

  const res = await fetch(`${GRAPH_API}/${igAccountId}/media_publish`, {
    method: 'POST',
    body: params,
  })
  const data = await res.json() as any
  if (data.error) throw new Error(data.error.message)

  // Try to get permalink
  let permalink: string | undefined
  try {
    const mediaRes = await fetch(`${GRAPH_API}/${data.id}?fields=permalink&access_token=${accessToken}`)
    const mediaData = await mediaRes.json() as any
    permalink = mediaData.permalink
  } catch { /* optional */ }

  return { id: data.id, permalink }
}
