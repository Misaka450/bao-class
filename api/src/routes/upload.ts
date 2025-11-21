import { Hono } from 'hono'

type Bindings = {
    R2: R2Bucket
}

const upload = new Hono<{ Bindings: Bindings }>()

// Upload image to R2
upload.post('/image', async (c) => {
    try {
        const formData = await c.req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return c.json({ error: 'No file provided' }, 400)
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return c.json({ error: 'Only image files are allowed' }, 400)
        }

        // Generate a unique key for the file
        const timestamp = Date.now()
        const extension = file.name.split('.').pop()
        const key = `uploads/${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`

        // Upload to R2
        await c.env.R2.put(key, file.stream(), {
            httpMetadata: {
                contentType: file.type
            }
        })

        return c.json({
            message: 'File uploaded successfully',
            key,
            url: `/api/upload/image/${key}`
        })
    } catch (error) {
        console.error('Upload error:', error)
        return c.json({ error: 'Upload failed' }, 500)
    }
})

// Get image from R2
upload.get('/image/:key{.+}', async (c) => {
    try {
        const key = c.req.param('key')
        const object = await c.env.R2.get(key)

        if (!object) {
            return c.json({ error: 'File not found' }, 404)
        }

        return new Response(object.body, {
            headers: {
                'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
                'Cache-Control': 'public, max-age=31536000'
            }
        })
    } catch (error) {
        console.error('Get image error:', error)
        return c.json({ error: 'Failed to retrieve file' }, 500)
    }
})

export default upload
