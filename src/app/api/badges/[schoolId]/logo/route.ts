import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
    request: Request,
    { params }: { params: { schoolId: string } }
) {
    const { schoolId } = params;

    try {
        // Fetch featured_schools from platform_settings
        const { data, error } = await supabase
            .from('platform_settings')
            .select('featured_schools')
            .eq('id', 1)
            .single();

        if (error || !data) {
            return new NextResponse('Not Found', { status: 404 });
        }

        const schools = data.featured_schools || [];
        const school = schools.find((s: any) => String(s.id) === String(schoolId));

        if (!school || !school.logo) {
            return new NextResponse('Logo Not Found', { status: 404 });
        }

        // Handle base64-encoded logo
        const base64Data = school.logo;
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

        if (!matches || matches.length !== 3) {
            return new NextResponse('Invalid Logo Data', { status: 500 });
        }

        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
            },
        });
    } catch (error) {
        console.error('Error fetching school logo:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
