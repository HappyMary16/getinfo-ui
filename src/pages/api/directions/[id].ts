import { PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authConfig } from "@/configs/auth";
import Joi from "joi";
import roles from "@/constants/roles";

const prisma = new PrismaClient();

const directionSchema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    professor: Joi.string().required(),
    color: Joi.string().required(),
    id: Joi.number().integer().required(),
    createdAt: Joi.string().required(),
    updatedAt: Joi.string().required(),
    subDirections: Joi.array()
        .items(
            Joi.object({
                name: Joi.string().required(),
                description: Joi.string().optional(),
                examplelink: Joi.string().uri().allow("").optional(),
                additionalInfo: Joi.string().allow("").optional(),
                downloadFile: Joi.boolean().optional(),
                textField: Joi.boolean().optional(),
                id: Joi.number().integer().optional(),
                directionId: Joi.number().integer().optional(),
                createdAt: Joi.string().optional(),
                updatedAt: Joi.string().optional(),
            }),
        )
        .required(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authConfig);
    if (session) {
        if (req.method === "DELETE") {
            if (session?.roles.includes(roles.ROLE_SUPPORT_ADMIN)) {
                const id = Number(req.query.id);

                if (isNaN(id)) {
                    res.status(400).json({ error: "Invalid ID format" });
                    return;
                }

                try {
                    await prisma.message.deleteMany({
                        where: {
                            requestId: {
                                in: await prisma.request
                                    .findMany({
                                        where: { directionId: id },
                                        select: { id: true },
                                    })
                                    .then((requests) => requests.map((request) => request.id)),
                            },
                        },
                    });
                    await prisma.request.deleteMany({
                        where: {
                            directionId: id,
                        },
                    });
                    await prisma.subDirections.deleteMany({
                        where: {
                            directionId: id,
                        },
                    });
                    await prisma.directions.delete({
                        where: {
                            id: id,
                        },
                    });
                    res.status(200).json({ message: "Successfully deleted" });
                } catch (error) {
                    console.error("Error deleting category:", error);
                    res.status(500).json({ message: "Failed to delete category" });
                }
            } else {
                return res.status(405).json({ error: "You do not have permission to perform this operation" });
            }
        } else if (req.method === "GET") {
            const id = Number(req.query.id);

            if (isNaN(id)) {
                res.status(400).json({ error: "Invalid ID format" });
            }

            try {
                const oneDirection = await prisma.directions.findUnique({
                    where: { id },
                    include: { subDirections: true },
                });

                if (oneDirection) {
                    res.status(201).json(oneDirection);
                } else {
                    res.status(500).json({ message: "Category not found" });
                }
            } catch (err) {
                console.log(err);
                res.status(500).json({ error: "An error occurred while creating the direction." });
            }
        } else if (req.method === "PUT") {
            if (session?.roles.includes(roles.ROLE_SUPPORT_ADMIN)) {
                const { error, value } = directionSchema.validate(req.body, { abortEarly: false });

                if (error) {
                    return res.status(400).json({ error: error.details.map((detail) => detail.message) });
                }

                const { name, description, professor, color, subDirections } = value;

                const id = Number(req.query.id);

                if (isNaN(id)) {
                    res.status(400).json({ error: "Invalid ID format" });
                    return;
                }

                try {
                    const updatedDirections = await prisma.directions.update({
                        where: {
                            id,
                        },
                        data: {
                            name,
                            description,
                            professor,
                            color,
                            subDirections: {
                                create: subDirections
                                    .filter((subDir: any) => !subDir.id)
                                    .map((subDir: any) => ({
                                        name: subDir.name,
                                        description: subDir.description,
                                        examplelink: subDir.examplelink,
                                        additionalInfo: subDir.additionalInfo,
                                        downloadFile: subDir.downloadFile,
                                        textField: subDir.textField,
                                    })),
                                update: subDirections
                                    .filter((subDir: any) => subDir.id)
                                    .map((subDir: any) => ({
                                        where: { id: subDir.id },
                                        data: {
                                            name: subDir.name,
                                            description: subDir.description,
                                            examplelink: subDir.examplelink,
                                            additionalInfo: subDir.additionalInfo,
                                            downloadFile: subDir.downloadFile,
                                            textField: subDir.textField,
                                        },
                                    })),

                                deleteMany: {
                                    name: {
                                        notIn: subDirections.map((subDir: any) => subDir.name),
                                    },
                                },
                            },
                        },
                        include: {
                            subDirections: true,
                        },
                    });

                    if (updatedDirections) {
                        return res.status(201).json(updatedDirections);
                    } else {
                        return res.status(500).json({ error: "There is no directions" });
                    }
                } catch (error) {
                    console.log(error);
                }
            } else {
                return res.status(405).json({ error: "You do not have permission to perform this operation" });
            }
        } else {
            res.status(405).json({ error: "Method Not Allowed" });
        }
    } else {
        res.status(405).json({ error: "User is not authorized" });
    }
}
