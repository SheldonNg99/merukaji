import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { extractVideoId, getVideoMetadata, getVideoTranscript } from '@/lib/youtube';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { url } = await req.json();
    const videoId = extractVideoId(url);
    if (!videoId) return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });

    const [metadata, transcript] = await Promise.all([
        getVideoMetadata(videoId),
        getVideoTranscript(videoId)
    ]);

    return NextResponse.json({ success: true, metadata, transcript });
}
