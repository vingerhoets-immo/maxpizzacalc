import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
export const runtime = 'edge';
const fail = () => NextResponse.json({ error: 'Die Presets sind derzeit nicht erreichbar.' }, { status: 503 });
export async function GET() { try { return NextResponse.json(await db().query('select * from teig_presets order by updated_at desc')); } catch { return fail(); } }
export async function POST(req: NextRequest) { try { const x=await req.json(), r=await db().query('insert into teig_presets (name,state) values ($1,$2::jsonb) returning *',[x.name,JSON.stringify(x.state)]); return NextResponse.json(r[0],{status:201}); } catch { return fail(); } }
export async function PUT(req: NextRequest) { try { const x=await req.json(), r=await db().query('update teig_presets set name=$2,state=$3::jsonb,updated_at=now() where id=$1 returning *',[x.id,x.name,JSON.stringify(x.state)]); return NextResponse.json(r[0]); } catch { return fail(); } }
export async function DELETE(req: NextRequest) { try { await db().query('delete from teig_presets where id=$1',[new URL(req.url).searchParams.get('id')]); return NextResponse.json({ok:true}); } catch { return fail(); } }
