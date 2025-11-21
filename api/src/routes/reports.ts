import { Hono } from 'hono'

const reports = new Hono()

reports.get('/', (c) => c.json({ message: 'Reports API' }))

export default reports
