const { Client, Intents, MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] });

// Belirli rolün ID'sini girin, bu role sahip kullanıcılar oylamaya katılabilir.
const allowedRoleID = '1121001440199069796';

client.once('ready', () => {
  console.log('Bot çalışıyor!');
});

const polls = new Map(); // Oylama bilgilerini saklamak için bir Map kullanıyoruz.

client.on('messageCreate', async (message) => {
  if (message.content.startsWith('+oylama')) {
    const args = message.content.slice(8).trim().split(' ');
    const title = args.shift();
    const duration = parseInt(args.shift()); // Dakika cinsinden süre

    if (!title || isNaN(duration)) {
      message.reply('Komutu şu şekilde kullanın: +oylama {başlık} {süre}');
      return;
    }

    if (duration > 60) {
      message.reply('Oylama süresi 60 dakikayı geçemez!');
      return;
    }

    // Evet/Hayır butonlarını oluşturuyoruz
    const row = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setCustomId('yes')
          .setLabel('Evet')
          .setStyle('SUCCESS'),
        new MessageButton()
          .setCustomId('no')
          .setLabel('Hayır')
          .setStyle('DANGER')
      );

    // Embed oluşturuyoruz
    const embed = new MessageEmbed()
      .setColor('#ffb400')
      .setTitle(title)
      .setDescription(`Oylama başlatıldı! Süre:  \`${duration} Dakika\``)
      .addField('Katılmak için aşağıdaki butonlardan birine basın.', 'Sadece belirli bir role sahip kullanıcılar oylamaya katılabilir.')
      .addField('Evet Oyları:', '0', true)
      .addField('Hayır Oyları:', '0', true);

    // Oylama başladığında gönderilen mesajı alıyoruz
    const pollMessage = await message.channel.send({ embeds: [embed], components: [row] });

    // Oylama bilgilerini Map'a ekliyoruz
    polls.set(pollMessage.id, { embed, row, votes: { yes: 0, no: 0 }, voters: new Set(), ended: false });

    // Süre bitince butonları kaldırmak için fonksiyonu başlatıyoruz
    setTimeout(() => endPoll(pollMessage.id), duration * 60000);
  }
});

// Kullanıcının oyunu kaydeden yardımcı fonksiyon
function castVote(interaction, voteType) {
  const poll = polls.get(interaction.message.id);
  if (!poll || poll.ended) {
    interaction.reply('Bu oylamaya oy veremezsiniz süresi dolmuş olabilir.');
    return;
  }

  // Kullanıcının belirli role sahip olup olmadığını kontrol ediyoruz
  const allowedRole = interaction.guild.roles.cache.get(allowedRoleID);
  if (!allowedRole) {
    interaction.reply('Bu oylamaya katılmak için gerekli rol mevcut değil. Lütfen yetkililere başvurun.');
    return;
  }

  if (!interaction.member.roles.cache.has(allowedRoleID)) {
    interaction.reply('Bu oylamaya katılmak için gerekli role sahip değilsiniz.');
    return;
  }

  if (poll.voters.has(interaction.user.id)) {
    interaction.reply('Zaten oy kullandınız!');
    return;
  }

  poll.voters.add(interaction.user.id);
  if (voteType === 'yes') poll.votes.yes++;
  if (voteType === 'no') poll.votes.no++;

  // Oyların sayısını güncelleyerek embed'ı düzenliyoruz
  poll.embed.fields[1].value = poll.votes.yes.toString();
  poll.embed.fields[2].value = poll.votes.no.toString();

  interaction.update({ embeds: [poll.embed], components: [poll.row] });
}

function endPoll(pollMessageId) {
  const poll = polls.get(pollMessageId);
  if (!poll) return;

  poll.ended = true;

  // Butonları dokunulmaz hale getiriyoruz
  poll.row.components = poll.row.components.map((button) =>
    button.setDisabled(true)
  );

  poll.embed.setDescription('Oylama süresi doldu. Oylama artık kapalı.');

  // Update the message embed to show buttons as disabled
  const pollMessage = client.channels.cache.get(pollMessageId);
  if (pollMessage) {
    pollMessage.edit({ embeds: [poll.embed], components: [poll.row] })
      .then(() => {
        // Kapatılan oylamayı Map'ten kaldırıyoruz
        polls.delete(pollMessageId);
      })
      .catch(console.error);
  }
}


// Botun buton etkileşimlerini dinlemesi için event
client.on('interactionCreate', (interaction) => {
  if (!interaction.isButton()) return;
  if (!polls.has(interaction.message.id)) return;

  const voteType = interaction.customId;
  if (voteType === 'yes' || voteType === 'no') {
    castVote(interaction, voteType);
  }
});

client.login('MTEzNDQyNDc0NTIzNzA0MTE1Mw.G7b_Ys.9tfg3t7xmlcP6BndilwjKzjLjtHf0yH4vAIcWo');
