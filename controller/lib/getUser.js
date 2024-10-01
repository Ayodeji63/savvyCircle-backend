import pkg from '@prisma/client';
const { PrismaClient } = pkg;
const prisma = new PrismaClient()

export default async function getUser(name) {
    try {
        const user = await prisma.user.findUnique({
            where: {
                username: name
            }
        });
        console.log(user);

        return user
    } catch (error) {
        console.log(error);

    }
}