import { NextRequest, NextResponse } from 'next/server';
import { config } from '../../../../config';

export async function POST(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('query') || '';
        const experience = searchParams.get('experience') || '';
        const salary = searchParams.get('salary');

        const response = await fetch(`${config.apiUrl}/hh/search?${searchParams.toString()}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
} 