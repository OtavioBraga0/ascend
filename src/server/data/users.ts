import "server-only";

import { prisma } from "@/lib/prisma";

export async function updateUserName(userId: string, name: string | null) {
  await prisma.user.update({ where: { id: userId }, data: { name } });
}
